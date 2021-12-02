/**
 * populate model data on top of the models but under the controllers/resolvers.
 */
const models = require('../models');

const _this = {
  populatePost: async (post, { fields = ['photos', 'user'], user_id = null } = {}) => {
    const mPost = new models.post(post);
    return Promise.all([
      models.photo.getByIds(mPost.photos),
      models.user.getById(mPost.user_id),
      user_id ? models.postLike.postLikesOfUser({ post_id: mPost.id, user_id }) : 0,
    ]).then(([photos, userPoster, likes]) => {
      const mUserPoster = new models.user(userPoster);
      return {
        ...mPost.output(),
        photos: photos.map((photo) => new models.photo(photo).output()),
        user: mUserPoster.asNormal(),
        liked: likes.length > 0 ? 1 : 0,
      };
    });
  },
  populatePosts: async (posts, { user_id }) => Promise.all(posts.map((post) => _this.populatePost(post, { user_id }))),
};

module.exports = _this;
