import { Ionicons } from "@expo/vector-icons";

export type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

/**
 * Returns the Ionicons name for a request type based on slug/name.
 * Use with: <Ionicons name={iconForRequestType(slug, name)} size={28} color={...} />
 */
export function iconForRequestType(slug: string, name: string): IoniconsName {
  const s = (slug || "").toLowerCase();
  const n = (name || "").toLowerCase();
  if (s.includes("garbage") || n.includes("garbage")) return "trash-outline";
  if (s.includes("water") || n.includes("water")) return "water-outline";
  if (s.includes("sewer") || n.includes("sewer") || s.includes("drainage") || n.includes("drainage"))
    return "water-outline";
  if (
    s.includes("electric") ||
    n.includes("electric") ||
    s.includes("street_light") ||
    n.includes("street light")
  )
    return "flash-outline";
  if (s.includes("road") || n.includes("road")) return "construct-outline";
  if (s.includes("other") || n.includes("other")) return "home-outline";
  return "document-text-outline";
}
