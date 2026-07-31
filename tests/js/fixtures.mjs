export const JOURNALS = [
  { name: "Journal of Widget Science", issn_l: "1111-2222", issns: ["1111-2222", "3333-4444"], publisher: "P1", publisher_name: "Wiley", works_count: 1200, tags: ["engineering-computer-science/electrical-electronic-engineering"] },
  { name: "Obscure Regional Review", issn_l: "5555-6666", issns: ["5555-6666"], publisher: "P9", publisher_name: "Tiny Society Press", works_count: 80, tags: ["humanities-literature-arts/history"] },
];
export const PUBLISHERS = {
  P1: { name: "Wiley", homepage: "https://www.wiley.com", oa_options: "https://authors.wiley.com/oa", embargo_sharing: "https://authors.wiley.com/self-archiving", apc: "https://authors.wiley.com/apc", note: "Green OA embargo 12-24 months.", verified: "2026-07-30" },
};
export const TA_SET = new Set(["3333-4444", "1111-2222"]);
