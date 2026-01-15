import { useMantineColorScheme } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useCallback, useEffect, useState } from "react";
import pb from "../lib/pocketbase";

type Theme = "light" | "dark" | "auto";
type SortOption =
  | "country"
  | "countryDesc"
  | "grade"
  | "gradeDesc"
  | "year"
  | "yearDesc"
  | "faceValue"
  | "faceValueDesc"
  | "dateAdded"
  | "dateAddedDesc";

type UserSettings = {
  id: string;
  userId: string;
  theme: Theme;
  gallerySort?: SortOption;
  filterCountry?: string[];
  filterGrade?: string[];
  created: string;
  updated: string;
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { setColorScheme } = useMantineColorScheme();

  // Load settings from PocketBase
  const loadSettings = useCallback(async () => {
    const userId = pb.authStore.record?.id;
    if (!userId) {
      // For unauthenticated users, check localStorage for theme preference
      const savedTheme = localStorage.getItem("themePreference");
      if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
        setColorScheme(savedTheme);
      }
      setLoading(false);
      return;
    }

    try {
      // Try to fetch existing settings
      const records = await pb
        .collection("user_settings")
        .getFullList<UserSettings>({
          filter: `userId = "${userId}"`,
        });

      if (records.length > 0) {
        const userSettings = records[0];
        setSettings(userSettings);
        applyTheme(userSettings.theme);
      } else {
        // Create default settings if none exist
        // Check localStorage for theme preference, default to 'auto'
        const savedTheme = localStorage.getItem("themePreference");
        const initialTheme =
          savedTheme === "light" ||
          savedTheme === "dark" ||
          savedTheme === "auto"
            ? (savedTheme as Theme)
            : "auto";

        const newSettings = await pb
          .collection("user_settings")
          .create<UserSettings>({
            userId: userId,
            theme: initialTheme,
            gallerySort: "country",
            filterCountry: [],
            filterGrade: [],
          });
        setSettings(newSettings);
        applyTheme(initialTheme);
        // Clear localStorage preference since it's now in the database
        localStorage.removeItem("themePreference");
      }
    } catch (error: any) {
      // Handle 403 Forbidden errors gracefully (collection may not be accessible)
      // This can happen in development/testing environments
      if (error?.status === 403) {
        console.debug("Settings collection not accessible (403 Forbidden)");
      } else {
        console.error("Failed to load settings:", error);
      }
      // Apply default theme and continue - settings are not critical
      applyTheme("auto");
    } finally {
      setLoading(false);
    }
  }, []);

  // Apply theme to Mantine
  const applyTheme = (theme: Theme) => {
    if (theme === "auto") {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setColorScheme(prefersDark ? "dark" : "light");
    } else {
      setColorScheme(theme);
    }
  };

  // Update theme preference
  const updateTheme = useCallback(
    async (newTheme: string) => {
      if (!settings?.id) return;

      try {
        const updatedSettings = await pb
          .collection("user_settings")
          .update<UserSettings>(settings.id, {
            theme: newTheme,
          });
        setSettings(updatedSettings);
        applyTheme(newTheme as Theme);

        notifications.show({
          title: "Theme Updated",
          message: `Theme changed to ${newTheme}`,
          color: "green",
        });
      } catch (error: any) {
        // Handle 403 Forbidden errors gracefully
        if (error?.status === 403) {
          console.debug("Settings collection not accessible (403 Forbidden)");
          applyTheme(newTheme as Theme);
          return;
        }
        console.error("Failed to update theme:", error);
        notifications.show({
          title: "Error",
          message: "Failed to update theme preference",
          color: "red",
        });
      }
    },
    [settings, setColorScheme]
  );

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (settings?.theme !== "auto") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setColorScheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [settings?.theme, setColorScheme]);

  // Update gallery settings (sort and filters)
  const updateGallerySettings = useCallback(
    async (updates: {
      gallerySort?: SortOption;
      filterCountry?: string[];
      filterGrade?: string[];
    }) => {
      if (!settings?.id) return;

      try {
        const updatedSettings = await pb
          .collection("user_settings")
          .update<UserSettings>(settings.id, updates);
        setSettings(updatedSettings);
      } catch (error: any) {
        // Handle 403 Forbidden errors gracefully (collection may not be accessible)
        if (error?.status === 403) {
          console.debug("Settings collection not accessible (403 Forbidden)");
          return;
        }
        console.error("Failed to update gallery settings:", error);
      }
    },
    [settings]
  );

  return {
    settings,
    loading,
    updateTheme,
    updateGallerySettings,
    reload: loadSettings,
  };
}
