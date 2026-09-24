export const CHARACTER_LETTERS = [..."humorme"];

export type Character = {
  id: string;
  letter: string;
  name: string | null;
  image_url: string | null;
  fact: string | null;
  sort_order: number;
};

export const EMPTY_CHARACTER_SLOTS: Character[] = CHARACTER_LETTERS.map(
  (letter, sort_order) => ({
    id: `placeholder-${sort_order}`,
    letter,
    name: null,
    image_url: null,
    fact: null,
    sort_order,
  }),
);
