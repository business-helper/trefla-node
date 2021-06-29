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
