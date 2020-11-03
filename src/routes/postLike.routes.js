const express = require("express");
const { Validator } = require("node-input-validator");
const notificationRouters = express.Router();

const postLikeCtrl = require("../controllers/postLike.controller");
const PostLike = require("../models/notification.model");
const User = require("../models/user.model");
const Post = require("../models/post.model");
const { BearerMiddleware } = require("../middlewares/basic.middleware");
const { respondValidateError } = require("../helpers/common.helpers");

// Bearer authentication
notificationRouters.use((req, res, next) => {
  BearerMiddleware(req, res, next);
});

// notificationRouters.get('/:id', async (req, res) => {
//   const validator = new Validator(
//     {
//       id: req.params.id
//     }, 
//     {
//       id: "required|integer",
//     }
//   );

//   validator.addPostRule(async (provider) =>
//     Promise.all([
//       Notification.getById(provider.inputs.id)
//     ]).then(([notiById]) => {
//       if (!notiById) {
//         provider.error(
//           "id",
//           "custom",
//           `Notification with id "${provider.inputs.id}" does not exists!`
//         );
//       }
//     })
//   );

//   return validator
//   .check()
//   .then((matched) => {
//     if (!matched) {
//       throw Object.assign(new Error("Invalid request"), {
//         code: 400,
//         details: validator.errors,
//       });
//     }
//   })
//   .then(() => notificationCtrl.getById(req, res))
//   .catch((error) => respondValidateError(res, error));
// })

// notificationRouters.post("/pagination", async (req, res) => {
//   const validator = new Validator(req.body, {
//     page: "required|integer",
//     limit: "required|integer",
//   });

//   return validator
//     .check()
//     .then((matched) => {
//       if (!matched) {
//         throw Object.assign(new Error("Invalid request"), {
//           code: 400,
//           details: validator.errors,
//         });
//       }
//     })
//     .then(() => notificationCtrl.pagination(req, res))
//     .catch((error) => respondValidateError(res, error));
// });

notificationRouters.post("/", async (req, res) => {
  const validator = new Validator(req.body, {
    user_id: "required|integer",
    post_id: "required|integer",
    type_id: "required|integer",
  });

  validator.addPostRule(async (provider) =>
    Promise.all([
      Post.getById(provider.inputs.post_id),
      User.getById(provider.inputs.user_id)
    ]).then(([post, user]) => {
      if (!post) {
        provider.error(
          "post_id",
          "custom",
          `Post with id "${provider.inputs.post_id}" does not exists!`
        );
      }
      if (!user) {
        provider.error(
          "id",
          "custom",
          `User with id "${provider.inputs.receiver_id}" does not exists!`
        );
      }
    })
  );

  return validator
    .check()
    .then((matched) => {
      if (!matched) {
        throw Object.assign(new Error("Invalid request"), {
          code: 400,
          details: validator.errors,
        });
      }
    })
    .then(() => postLikeCtrl.create(req, res))
    .catch((error) => respondValidateError(res, error));
});

module.exports = notificationRouters;
