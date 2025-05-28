/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_4145231549");

  // add voice field only (createdBy and isPublic already exist)
  collection.fields.addAt(11, new Field({
    "hidden": false,
    "id": "text" + Date.now(),
    "name": "voice",
    "presentable": false,
    "required": false,
    "system": false,
    "type": "text"
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_4145231549");
  
  // remove voice field
  collection.fields.removeByName("voice");

  return app.save(collection);
})