import type { PublicGoodDirectResult } from "@/app/_lib/public-good-direct";

export function createPublicGoodView(
  result: PublicGoodDirectResult | null,
  selectedId: string | null
) {
  if (!result?.displayable || result.items.length === 0) {
    return null;
  }

  const people = result.items.slice(0, 5);
  const selectedPerson =
    people.find((person) => person.id === selectedId) ?? people[0];

  return { people, selectedPerson };
}
