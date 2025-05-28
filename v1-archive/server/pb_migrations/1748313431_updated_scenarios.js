/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4145231549")

  // update field
  collection.fields.addAt(4, new Field({
    "hidden": false,
    "id": "select1787165949",
    "maxSelect": 1,
    "name": "difficulty",
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

  return app.save(collection)
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4145231549")

  // update field
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

  return app.save(collection)
})
