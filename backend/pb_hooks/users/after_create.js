/// <reference path="../../types/pb_hooks.js" />

/**
 * Hook that creates default user_settings when a new user signs up
 * This runs after a user is created in the users collection
 */
module.exports = (record, context) => {
  try {
    const dao = context.app.dao();

    // Create default user_settings for the new user
    // This bypasses the createRule (userId = @request.auth.id) permission check
    // because hooks run with admin privileges when using the DAO
    const settingsRecord = dao.createRecord("user_settings", {
      userId: record.id,
      theme: "auto",
      gallerySort: "country",
      filterCountry: [],
      filterGrade: [],
    });

    // Save the record to the database
    dao.saveRecord(settingsRecord);

    console.log(`✅ Created default user_settings for user ${record.id}`);
  } catch (error) {
    console.error(
      "❌ Failed to create user_settings for new user:",
      error.message,
    );
    // Don't throw - we don't want to block user creation if settings fail
  }

  return record;
};
