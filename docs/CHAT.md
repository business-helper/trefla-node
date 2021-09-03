
# Trefla Chat

There are 2 chat types - Normal and Card chats.

Normal chats are about post, comment, and general chat between 2 users.

Card chat is about card number and the reciever must be the verified owner of the driver ID.


## chat.sources [JSON]

- contains the array of the following json objects.

```json
  {
    "target_id": "<string>",
    "from_where": "Enums[POST, COMMENT, NONE]",
    "last_msg_id": 0
  }
```

or for card chat,

```json
{
  "target_id": "Card Number<String>",
  "from_where": "CARD"
}
```