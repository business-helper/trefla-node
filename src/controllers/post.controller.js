const { Validator } = require("node-input-validator");
const Post = require("../models/post.model");
const PostLike = require("../models/postLike.model");
const { generateTZTimeString, getTotalLikes, respondError } = require("../helpers/common.helpers");
const { generatePostData, generatePostLikeData } = require('../helpers/model.helpers');



exports.create = (req, res) => {
  let postData = generatePostData(req.body);
  postData.user_id = req.body.post_user_id;
  postData.post_time = req.body.post_time ? req.body.post_time : generateTZTimeString();
  return Post.create(postData)
    .then((post) => res.json({ status: true, message: "success", data: Post.output(post) }))
    .catch((error) => respondError(res, error));
};

exports.getById = (req, res) => {
  const { id } = req.params;
  return Post.getById(id)
    .then(post => res.json({ 
      status: true,
      message: 'success',
      data: Post.output(post)
    }))
    .catch((error) => respondError(res, error));
}

exports.pagination = (req, res) => {
  const { page, limit } = req.body;
  const offset = page * limit;
  return Promise.all([
    Post.pagination({ limit, offset }),
    Post.getAll(),
  ])
    .then(([posts, allPosts]) => {
      return res.json({
        status: true,
        message: 'success',
        data: posts.map(item => Post.output(item)),
        pager: {
          page,
          limit,
          total: allPosts.length
        },
        hadMore: (limit * page + posts.length) < allPosts.length
      });
    })
    .catch((error) => respondError(res, error));
}

exports.getAll = (req, res) => {
  Post.getAll()
    .then((langs) =>
      res.json({ status: true, message: "success", data: langs })
    )
    .catch((error) =>
      res.status(500).json({
        status: false,
        message: error.message || "Something went wrong!",
      })
    );
};

// to-do: permission check. only admin or creator can update it.
exports.updateById = (req, res) => {
  const { id } = req.params;
  return Post.getById(id)
    .then(post => {
      // remove user id in update data
      let updateData = {};
      const disallowedKeys = ['id', 'user_id'];
      Object.keys(req.body).forEach(key => {
        if (disallowedKeys.includes(key)) {
          // skip it
        // } else if (key === 'isGuest') {
        //   post.isGuest = bool2Int(req.body.isGuest);
        } else if (post[key] !== undefined) {
          post[key] = req.body[key];
        }
      });
      return Post.save(post);      
    })
    .then(newPost => res.json({
      status: true,
      message: 'success',
      data: Post.output(newPost)
    }))
    .catch((error) => respondError(res, error));
}

exports.togglePostLike = (req, res) => {
  const { id: post_id } = req.params;
  const { user_id, type } = req.body;
  return PostLike.userLikedPost({ user_id, post_id, type })
    .then(postLike => {
      return postLike ? dislikePost({ user_id, post_id, type }) : likePost({ user_id, post_id, type });
    })
    .then(result => res.json({
      status: !!result,
      message: result ? 'success' : 'failed'
    }))
    .catch((error) => respondError(res, error));
}

const dislikePost = ({ user_id, post_id, type }) => {
  return Promise.all([
    Post.getById(post_id),
    PostLike.userLikedPost({ user_id, post_id, type })
  ])
    .then(([post, postLike]) => {
      const like_fld = `like_${type}_num`;
      post[like_fld] = post[like_fld] ? post[like_fld] - 1 : 0;
      post['liked'] = getTotalLikes(post);
      return Promise.all([
        PostLike.deleteById(postLike.id),
        Post.save(post)
      ])
    })
    .then(([deleted, newPost]) => {
      return deleted && newPost;
    })
    .catch((error) => false);
}

const likePost = ({ user_id, post_id, type }) => {
  return Promise.all([
    Post.getById(post_id),
    PostLike.userLikedPost({ user_id, post_id, type })
  ])
    .then(([post, postLike]) => {
      if (postLike) {
        throw Object.assign(new Error('You liked this post already!'), { code: 400 }); return;
      }
      const like_fld = `like_${type}_num`;
      post[like_fld] = post[like_fld] + 1;
      post['liked'] = getTotalLikes(post);

      const plData = generatePostLikeData({ user_id, post_id, type });
      return Promise.all([
        PostLike.create(plData),
        Post.save(post)
      ])
    })
    .then(([created, newPost]) => {
      return created && newPost;
    })
    .catch((error) => {
      console.log('[Like Post]', error.message);
      return false
    });
}
