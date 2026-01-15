const PocketBase = require("pocketbase/cjs");

// Connect to PocketBase
const POCKETBASE_URL = process.env.POCKETBASE_URL || "http://localhost:8090";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    "❌ ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required",
  );
  process.exit(1);
}

async function setupUserSettings() {
  try {
    console.log("🔧 Setting up user_settings collection...");

    // Authenticate as admin
    const pb = new PocketBase(POCKETBASE_URL);
    await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
    console.log("✅ Authenticated as admin");

    // Check if collection already exists
    console.log("🔍 Checking for existing user_settings collection...");
    const collections = await pb.collections.getFullList();
    console.log(`📊 Found ${collections.length} existing collections`);

    const existingCollection = collections.find(
      (c) => c.name === "user_settings",
    );

    if (existingCollection) {
      console.log(
        "ℹ️  user_settings collection already exists, checking permissions...",
      );

      // Check if permissions are already set correctly
      const needsUpdate =
        existingCollection.listRule !== "userId = @request.auth.id" ||
        existingCollection.viewRule !== "userId = @request.auth.id" ||
        existingCollection.createRule !== "userId = @request.auth.id";

      if (needsUpdate) {
        console.log("🔄 Updating collection permissions...");
        await pb.collections.update(existingCollection.id, {
          listRule: "userId = @request.auth.id",
          viewRule: "userId = @request.auth.id",
          createRule: "userId = @request.auth.id",
          updateRule: "userId = @request.auth.id",
          deleteRule: "userId = @request.auth.id",
        });
        console.log("✅ Updated user_settings collection permissions");
      } else {
        console.log(
          "✅ user_settings collection permissions are already correct",
        );
      }
    } else {
      // Create new collection
      console.log("📝 Creating user_settings collection...");

      try {
        const collection = await pb.collections.create({
          name: "user_settings",
          type: "base",
          schema: [
            {
              name: "userId",
              type: "relation",
              required: true,
              unique: false,
              options: {
                collectionId: "_pb_users_auth_",
                cascadeDelete: true,
                minSelect: null,
                maxSelect: 1,
                displayFields: ["email"],
              },
            },
            {
              name: "theme",
              type: "select",
              required: false,
              options: {
                maxSelect: 1,
                values: ["light", "dark", "auto"],
              },
            },
            {
              name: "gallerySort",
              type: "select",
              required: false,
              options: {
                maxSelect: 1,
                values: [
                  "country",
                  "countryDesc",
                  "grade",
                  "gradeDesc",
                  "year",
                  "yearDesc",
                  "faceValue",
                  "faceValueDesc",
                  "dateAdded",
                  "dateAddedDesc",
                ],
              },
            },
            {
              name: "filterCountry",
              type: "json",
              required: false,
              options: {},
            },
            {
              name: "filterGrade",
              type: "json",
              required: false,
              options: {},
            },
          ],
          // Row level security: users can only access their own settings
          listRule: "userId = @request.auth.id",
          viewRule: "userId = @request.auth.id",
          createRule: "userId = @request.auth.id",
          updateRule: "userId = @request.auth.id",
          deleteRule: "userId = @request.auth.id",
        });

        console.log("✅ Created user_settings collection");
      } catch (createError) {
        console.error("❌ Failed to create collection:", createError.message);
        console.log(
          "💡 The collection might already exist or you might not have permissions",
        );

        // Try to find it again in case it was created between checks
        const collectionsAfter = await pb.collections.getFullList();
        const collectionNow = collectionsAfter.find(
          (c) => c.name === "user_settings",
        );

        if (collectionNow) {
          console.log(
            "✅ Collection was actually created, updating permissions...",
          );
          await pb.collections.update(collectionNow.id, {
            listRule: "userId = @request.auth.id",
            viewRule: "userId = @request.auth.id",
            createRule: "userId = @request.auth.id",
            updateRule: "userId = @request.auth.id",
            deleteRule: "userId = @request.auth.id",
          });
          console.log("✅ Updated user_settings collection permissions");
        } else {
          throw createError;
        }
      }
    }

    console.log("🎉 User settings setup complete!");
    console.log("📋 Collection rules applied:");
    console.log(
      "   • Users can only access their own settings (userId filter)",
    );
    console.log(
      "   • Read, write, update, delete permissions granted for owners",
    );
  } catch (error) {
    console.error("❌ Failed to setup user settings:", error.message);
    console.error("💡 Make sure:");
    console.error("   • You're logged in to the PocketBase admin panel");
    console.error("   • The PocketBase server is running");
    console.error("   • Your admin credentials are correct");
    throw error;
  }
}

setupUserSettings();
