/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4145231549")

  // add field
  collection.fields.addAt(3, new Field({
    "hidden": false,
    "id": "select105650625",
    "maxSelect": 1,
    "name": "category",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "technical",
      "behavioral",
      "academic",
      "medical",
      "language",
      "custom"
    ]
  }))

  // add field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "select1787165949",
    "maxSelect": 1,
    "name": "difficulity",
    "presentable": false,
    "required": true,
    "system": false,
    "type": "select",
    "values": [
      "beginner",
      "intermediate",
      "advanced"
    ]
  }))

  // add field
  collection.fields.addAt(5, new Field({
    "hidden": false,
    "id": "number2865594606",
    "max": 60,
    "min": 5,
    "name": "estimatedMinutes",
    "onlyInt": false,
    "presentable": false,
    "required": true,
    "system": false,
    "type": "number"
  }))

  // add field
  collection.fields.addAt(6, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text3149143560",
    "max": 2000,
    "min": 1,
    "name": "systemPrompt",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(7, new Field({
    "autogeneratePattern": "",
    "hidden": false,
    "id": "text4192694684",
    "max": 1000,
    "min": 1,
    "name": "initialMessage",
    "pattern": "",
    "presentable": false,
    "primaryKey": false,
    "required": true,
    "system": false,
    "type": "text"
  }))

  // add field
  collection.fields.addAt(8, new Field({
    "hidden": false,
    "id": "json1874629670",
    "maxSize": 0,
    "name": "tags",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "json"
  }))

  // add field
  collection.fields.addAt(9, new Field({
    "hidden": false,
    "id": "bool4208731335",
    "name": "isPublic",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "bool"
  }))

  // add field
  collection.fields.addAt(10, new Field({
    "cascadeDelete": false,
    "collectionId": "_pb_users_auth_",
    "hidden": false,
    "id": "relation3545646658",
    "maxSelect": 1,
    "minSelect": 0,
    "name": "createdBy",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "relation"
  }))

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4145231549")

  // remove field
  collection.fields.removeById("select105650625")

  // remove field
  collection.fields.removeById("select1787165949")

  // remove field
  collection.fields.removeById("number2865594606")

  // remove field
  collection.fields.removeById("text3149143560")

  // remove field
  collection.fields.removeById("text4192694684")

  // remove field
  collection.fields.removeById("json1874629670")

  // remove field
  collection.fields.removeById("bool4208731335")

  // remove field
  collection.fields.removeById("relation3545646658")

  return app.save(collection)
})
