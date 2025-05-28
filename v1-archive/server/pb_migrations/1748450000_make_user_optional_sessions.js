/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("pbc_3660498186");

  // Find and update the user field to make it optional
  const userField = collection.fields.find(f => f.name === "user");
  if (userField) {
    userField.required = false;
    userField.minSelect = 0;
  }

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("pbc_3660498186");

  // Revert: make user field required again
  const userField = collection.fields.find(f => f.name === "user");
  if (userField) {
    userField.required = true;
    userField.minSelect = 0;
  }

  return app.save(collection);
})