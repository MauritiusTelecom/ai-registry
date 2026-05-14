/**
 * Re-export the canonical Icon registry. The implementation still lives in
 * `components/public/Icon.tsx` for now — once every consumer has migrated to
 * `@/components/library`, the file can be moved here outright.
 */
export { Icon, type IconName } from "@/components/public/Icon";
