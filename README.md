# Trefla Back-End(npm)

## Tech stacks

- node.js
- mysql
- socket.io

## MySQL tricks

## JSON ([documentation](https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html))
- JSON Extract: JSON_EXTRACT

- Check if JSON array contains a specific value

```sql
SELECT * FROM users WHERE JSON_SEARCH(bouquet, 'one', '3') IS NOT NULL
```

