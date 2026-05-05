/**
 * Shared category taxonomy used by polls, petitions, and all filter components.
 * All content types must use values from this list for filters and discovery to work.
 */

export const PLATFORM_CATEGORIES = [
  { value: "government_policy",     label: "Government Policy" },
  { value: "local_council",         label: "Local Council" },
  { value: "corporate_policy",      label: "Corporate Policy" },
  { value: "human_rights",          label: "Human Rights" },
  { value: "environment",           label: "Environment & Climate" },
  { value: "health",                label: "Health & Wellbeing" },
  { value: "economy",               label: "Economy & Cost of Living" },
  { value: "technology",            label: "Technology & AI" },
  { value: "education",             label: "Education" },
  { value: "housing",               label: "Housing" },
  { value: "justice",               label: "Justice & Law Reform" },
  { value: "disability",            label: "Disability Rights" },
  { value: "indigenous_rights",     label: "Indigenous Rights" },
  { value: "immigration",           label: "Immigration" },
  { value: "consumer_rights",       label: "Consumer Rights" },
  { value: "global_affairs",        label: "Global Affairs" },
  { value: "other",                 label: "Other" },
];

// For filter dropdowns — includes an "all" option
export const PLATFORM_CATEGORIES_WITH_ALL = [
  { value: "all", label: "All Categories" },
  ...PLATFORM_CATEGORIES,
];

// Label lookup
export const getCategoryLabel = (value) =>
  PLATFORM_CATEGORIES.find(c => c.value === value)?.label
  || value?.replace(/_/g, " ")
  || "Other";