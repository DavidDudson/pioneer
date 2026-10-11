-- Content ids are UUIDv5 of <pack>/<kind>:<name> (ADR-0034): every slug gained its kind, so every id changed.
-- In place, not expand-then-contract (ADR-0011): there is no production database yet, so this is fixed forward.
-- A character document names content by id (its build choices), so each old id in it becomes the new one. One
-- UPDATE per pair: an UPDATE ... FROM changes a row once, and a document can name several entries.
DO $$
DECLARE
  remap record;
BEGIN
  FOR remap IN SELECT * FROM (VALUES
    ('87d49891-adee-522e-b478-93e77308482b', 'e6d808d9-95b9-5477-8322-791194226314'), -- player-core/ancestry:dwarf
    ('d10d29db-62ec-5b40-984e-cd3bfce29991', '85929532-15d1-52c2-8500-d3b27f174266'), -- player-core/ancestry:elf
    ('baa51e19-9701-53d3-9589-acaa8e3744a2', 'be1b027a-40cb-5267-ac66-7cdc1c0d7813'), -- player-core/ancestry:gnome
    ('19b27be4-62c2-5050-9ccd-2b960ba3194b', '054f4768-e40c-50b9-bf71-cebc5bd9064e'), -- player-core/ancestry:goblin
    ('da9f0ffe-16b0-5f1b-8f2f-4f0f253c057d', 'abf704ef-d31d-527c-b030-3bd58a49b0bd'), -- player-core/ancestry:halfling
    ('f10cdb85-0c8e-5795-9741-a0f4790f2bf3', '58312ecf-5705-5e7d-b695-248d34618288'), -- player-core/ancestry:human
    ('24425fee-2efe-50a0-83a9-011cf28c3d24', '54baa0f3-c686-58a5-91b3-4ccfa6b8d011'), -- player-core/ancestry:leshy
    ('169f1809-dcaf-5293-b603-f7a12cdc6084', '27e47483-e581-53af-992f-7b19ac052ab4'), -- player-core/ancestry:orc
    ('8302a500-eb59-5cf8-812d-5c742447e1ae', '3ae2bd31-47ee-52f1-ba35-f3d2e23db3c9'), -- monster-core/creature:zombie-shambler
    ('d81fa877-5d2c-590b-be51-2c848e447da4', '7737d8ba-61d5-58d1-9215-46987c2bb483'), -- core-rules/statistic:armor-class
    ('aa960dea-e6c9-561d-85f2-8c33dc8d64be', 'c16299b7-d064-540c-8c4b-659ef89d4cc0'), -- core-rules/statistic:fortitude
    ('ab19db15-90c5-511b-84b2-4421d45a317e', '1e0faae5-d668-5df4-ae46-9612aa44a84d'), -- core-rules/statistic:reflex
    ('3961124b-8b81-5793-99a2-bd45189b2a5c', '6982b489-c23e-5712-8d46-634dfc9b45ad'), -- core-rules/statistic:will
    ('c37d410e-c489-596f-b8a7-9cd7640f674c', 'd7d3a54b-f54a-5756-8341-4ad40b1444ba'), -- core-rules/statistic:perception
    ('99017053-1d73-5d98-911e-846f6b168f26', '0517252b-998f-5592-979f-94762a803160'), -- core-rules/statistic:hit-points
    ('b4ee899b-03a6-5180-a48e-8dd75ddfd8b4', '5aa7bd1a-accb-536c-9f5f-8f3b5ebe4399'), -- core-rules/statistic:land-speed
    ('3d4b4a27-6298-5549-aca6-d1df3619c89e', 'e329ba71-6879-5ab9-be72-cb8f4324b343'), -- core-rules/statistic:class-dc
    ('b981f8a1-3605-5285-8573-f47a122704b4', '79a9d81a-c8ba-50fc-bbf9-130cf4df414e'), -- core-rules/statistic:strike
    ('a3d39a0f-7e18-5330-bbe1-170364f24585', '56a8469b-a0d0-5f3b-96c2-f17e379832a4'), -- core-rules/statistic:spell-attack
    ('5d41a98c-a7d4-535d-8525-30ef5f1bb4bb', 'bdeec3fd-87ef-5283-99e0-72f53a2da847'), -- core-rules/statistic:spell-dc
    ('5f93daa2-5dc6-5af6-b86e-b291be01f876', 'a6e7e63b-84e0-54eb-90db-dad5349cc11a'), -- core-rules/statistic:acrobatics
    ('56be0bbc-a57a-542a-b8b4-570bf07dc8d8', 'a696ec98-9f99-54e7-b01f-8492aeda31e3'), -- core-rules/statistic:arcana
    ('fe748c5a-e667-58cc-b941-4fd6bf566bc3', '5856029a-f484-558f-84b4-9ffe6321007c'), -- core-rules/statistic:athletics
    ('ae010692-344b-530a-9ddd-f8e31b289b76', 'c4f4a157-362d-5947-81a1-984b542635a3'), -- core-rules/statistic:crafting
    ('78e74d14-6c63-5538-8b40-cad3590eb2e1', 'cdd83def-a954-58f5-8134-be7d9765bc30'), -- core-rules/statistic:deception
    ('7ed070f0-3dbd-5ad0-a740-b030c1b04049', '82aaf7e3-8e0b-5f5e-872f-28840a7f07ff'), -- core-rules/statistic:diplomacy
    ('2b23951d-4642-55fa-9e70-03c7cb56ffa7', '1a984615-e95d-57e1-91d3-58caa6bf17df'), -- core-rules/statistic:intimidation
    ('c824b20d-0e3c-51db-ae5f-020a4707bf46', '9516eda9-9dcf-59ea-99d9-78b20b64d734'), -- core-rules/statistic:medicine
    ('9b00dcfa-e2f4-543a-8888-5900529949ef', '392a2f87-4c11-5824-b927-07254c8ef7e3'), -- core-rules/statistic:nature
    ('306a75e4-5ecd-5ec6-8377-4a103b47ec93', 'be4749d6-c4e0-5f2d-8282-5966cc2cbc94'), -- core-rules/statistic:occultism
    ('06e3d009-ea5c-5472-af03-f17fbb297f20', '23d62123-d33e-5440-be8b-c957a6f06f37'), -- core-rules/statistic:performance
    ('a8f69f35-c442-52d2-894b-5266e1852b0b', '958254ce-39e2-5550-93b4-751248304054'), -- core-rules/statistic:religion
    ('be7a2bcd-7d42-5a36-9d29-fbe653ea6faa', 'e130f966-439e-5be5-a430-fa6eb0127c8c'), -- core-rules/statistic:society
    ('1f21561d-63a0-5622-afb7-9e337cb46d62', 'a93683a0-b551-5be9-8374-1824003f6c94'), -- core-rules/statistic:stealth
    ('6ee19ee3-33de-5792-9a4e-cc398084e346', '72ad4eab-fe31-5eaa-aec1-d936eab77ac2'), -- core-rules/statistic:survival
    ('ed635993-27d2-5866-9acb-039250e16e6c', 'd0b8f701-f8a4-5ef3-9ae5-392b2cb24415'), -- core-rules/statistic:thievery
    ('9ef5b9f3-c3b1-57aa-a847-25f68ca30427', '444a2133-3e11-55b6-b57a-1f11ebe8e12b'), -- core-rules/language:common
    ('1367029e-6456-5a80-9772-2846e6747883', '17635451-e596-5045-8af5-47f581cd1a40'), -- core-rules/language:draconic
    ('a54fbd03-5614-5607-87f9-e5a40846321f', 'c49a86a0-8e49-56c1-86f9-eaa50a3297e3'), -- core-rules/language:dwarven
    ('02d4ab36-444f-57c6-aea7-6f2ff6a09b22', '3128d8af-f464-563e-ac8d-ac86a7e9408b'), -- core-rules/language:elven
    ('c2275701-b366-57f6-a6d8-b24f143ef9aa', '30b3a33b-b3f0-5ba1-9e46-aed5301bb2ce'), -- core-rules/language:fey
    ('c5896f47-3872-5363-b5f9-01d6e6fe2568', 'd2200e11-b3e5-5878-be67-4f4492c1f76d'), -- core-rules/language:gnomish
    ('c3522b95-89e6-575b-8591-02cbf7cbd645', 'cc56a173-7e20-50ca-b027-1a5aca98fe4b'), -- core-rules/language:goblin
    ('2a3cd6da-1de8-57fd-9550-5f3e7a7998d6', '6901cc04-49bb-5344-bcaa-a4a99712d566'), -- core-rules/language:halfling
    ('0e759640-34b7-5999-91b4-d7c86a0e3875', '315eced7-9fa5-595b-bdab-002877559cff'), -- core-rules/language:jotun
    ('9390a12d-a784-57d7-8af0-58fed47caf4a', '4d4fb5fa-160d-553f-b657-24105dc56050'), -- core-rules/language:orcish
    ('21afbe07-694e-5bd6-89ac-9b92206f50f5', 'da0478dc-3e4f-5abb-9b5f-79be74bf143e'), -- core-rules/language:sakvroth
    ('39cf7542-e68c-5298-8ab1-5c4b9f4efe43', 'c60a69f8-1fae-5452-9c94-4cf2bd4662b1'), -- core-rules/language:empyrean
    ('2f1eaa2b-d2ed-5095-9136-d10fb7ba7ccd', '1fb509e8-a33a-5a44-85ab-733764797c61'), -- core-rules/language:kholo
    ('d11e6f74-1846-5d0f-a28c-b67e7fe850a3', 'ff9d8655-df77-52bc-852f-ee4669509e08'), -- core-rules/language:petran
    ('8e335e9a-e966-529a-8b5d-5be7dba6a61d', '67979b6a-4b24-5be5-b7ea-94783c497bcb'), -- core-rules/sense:darkvision
    ('d177c026-2e38-5147-b32d-66104c47e988', '16b42c38-9373-58ec-a7ac-2221bb17a71c'), -- core-rules/sense:low-light-vision
    ('058de5b7-3536-5cbd-aadc-901767d4e75c', 'a8e09e01-8dbe-5055-920b-453ebd93493d') -- core-rules/variant-rule:proficiency-without-level
  ) AS pairs (old_id, new_id) LOOP
    UPDATE "characters" SET "document" = replace("document"::text, remap.old_id, remap.new_id)::jsonb
    WHERE "document"::text LIKE '%' || remap.old_id || '%';
  END LOOP;
END
$$;
