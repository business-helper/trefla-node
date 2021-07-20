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

- [Generating a new SSH key and adding it to the ssh-agent](https://docs.github.com/en/github/authenticating-to-github/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"

ssh-agent -s
ssh-add ~/.ssh/rsa_git
```
- Public Key - rsa_git.pub
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQC9FzkIPz32bJvdTgT4RT9oecLEMpzGMuHlnIo2F61RV8nkmYRoBeU06i1I8OwpuUCmpMAQtfCsXWY2GN7/2TNuTmWgJAXa5xLmyERdLhq0JwTCcz6KSy2RRPTMNc68Rsss8wcL/wWFs3grhstZZOco6kW2RLcogKiEO50m9tRx57oEUDY/yZOY3xXCT/tIuzxaleJiRz4Oju9ZwbtdvQ9HkFbPv6NSH5wN6M4VrLl/2HztJI+bNaOxh9QErFBhcDifo2f0RCyBDYpUcWwWctr2TrIK/Mo+lgrs+lay2V7aez9KSBiORel4mXMhHfzRqlAxXoDZs+Sg2gneTZqlN4CNSE1cqzJ37brzmMaXuS1VqsF9fCBrW2YPEcvEVUumhL4gNw9+mMS3aAgWjv3jRKmdUCzxJ285+STZtJKvzYGrugd4RVDOHcxnMIHyMNPEFlfoj55SxRg1Pmi5glDYFI7Kbl5B77skY8r52x7k82I6P79BWnuiRBQpNLglycfSdJN/ewnJ6Y6GzlHGh2b4v2mvR/wacNe/XrPjPO2VqmboWkcdcGVOQsDMn/g37sv++RK3BWZMRpOJZK9zaPBTWVqepSGoc0UCc3zTsXgY6nUWNuroLXN5Gg6Xvebn0pT1++cswfQ5kru+Ge50e77FmSzD0cjBYz4ltSawjLNBCAE67w== alerk_star@outlook.com



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
