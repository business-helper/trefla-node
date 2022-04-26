# Trefla Back-End(npm)


## Database Migration

- [package](https://www.npmjs.com/package/db-migrate)
- [documentation](https://db-migrate.readthedocs.io/en/latest/)

- [Data Types](https://github.com/db-migrate/shared/blob/master/data_type.js)

### Installation
```bash
npm install -g db-migrate

```

### Commands
```bash
db-migrate create migrate-in-table
db-migrate up
```

## CI/CD
referred to [this article](https://ironeko.com/posts/how-to-set-up-a-ci-cd-pipeline-to-an-ubuntu-server-with-github)

- GEN SSH Key
https://docs.github.com/en/github/authenticating-to-github/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent

- before 'git pull'
https://stackoverflow.com/a/21909432/9644424


- [Generating a new SSH key and adding it to the ssh-agent](https://docs.github.com/en/github/authenticating-to-github/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"

# [Could not open a connection to your authentication agent](https://stackoverflow.com/a/21909432/9644424)
ssh-agent -s
ssh-add ~/.ssh/rsa_git
```




## Tech stacks

- node.js
- mysql
- socket.io


## Branches

### verifyV1 (2020.12.05)

- card chat: add user to user_ids in chat on each verification & card transfer




## MySQL tricks

## JSON ([documentation](https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html))
- JSON Extract: JSON_EXTRACT

- Check if JSON array contains a specific value

```sql
SELECT * FROM users WHERE JSON_SEARCH(bouquet, 'one', '3') IS NOT NULL
```

## Socket.io

### emit from server

- return response

```js
  socket.emit('event_name', data);
```

- send to a single user
```js
  io.to(socket_id).emit('event_name' , data);
```

- send to room partners

```js
 socket.to(room_id).emit()
```

- send to all users in room
  io.to(room_id).emit();

## Chat

- user ids : n
- online_status: n
- last_messages: n-1,
- lastMsgIdOnTransfer: n-2

## References

[How to open some ports on Ubuntu?](https://stackoverflow.com/questions/30251889/how-to-open-some-ports-on-ubuntu)
## Image Upload
- profile
thumbnail ->
profile update

- card
update user.card_image_url after uploading.


## TO-DO

- [admin] update user profile to check match profile and preference
