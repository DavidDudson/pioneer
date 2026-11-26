/**
 * Turns the Nx project graph into one stable JSON document per project, so a refactor of how targets are declared
 * (`project.json`, `nx.json` defaults, an inference plugin) can be proved a no-op by diffing two snapshots.
 */
import * as z from 'zod';

/** The parts of a target that decide what it runs, what it caches and when it reruns. Anything else is noise. */
const TARGET_FIELDS: ReadonlySet<string> = new Set([
  'executor',
  'options',
  'configurations',
  'defaultConfiguration',
  'inputs',
  'outputs',
  'dependsOn',
  'cache',
  'continuous',
  'parallelism',
]);

const JsonSchema = z.json();

/** Any JSON value: a target's options and inputs are free-form. */
type Json = z.infer<typeof JsonSchema>;

const GraphTargetSchema = z.record(z.string(), JsonSchema);

/** A target as the graph file prints it. */
type GraphTarget = z.infer<typeof GraphTargetSchema>;

const GraphTargetsSchema = z.record(z.string(), GraphTargetSchema);
const GraphTagsSchema = z.array(z.string());
const GraphDataSchema = z.object({ tags: GraphTagsSchema.optional(), targets: GraphTargetsSchema.optional() });
const GraphProjectSchema = z.object({ data: GraphDataSchema });

/** A project node of the graph file: only its tags and targets are read. */
type GraphProject = z.infer<typeof GraphProjectSchema>;

const GraphNodesSchema = z.record(z.string(), GraphProjectSchema);
const GraphFileSchema = z.object({ graph: z.object({ nodes: GraphNodesSchema }) });

/** The project nodes of an `nx graph --file` document, by project name. */
export function parseGraphNodes(text: string): Readonly<Record<string, GraphProject>> {
  const document: unknown = JSON.parse(text);

  return GraphFileSchema.parse(document).graph.nodes;
}

/** A `JSON.stringify` replacer that writes every plain object with its keys sorted, so equal values print equal. */
function sortedKeys(_key: string, value: Json): Json {
  const isPlainObject = value !== null && Object.getPrototypeOf(value) === Object.prototype;

  if (!isPlainObject) {
    return value;
  }

  // SAFETY: the prototype check above proves `value` is a plain object, so its entries are string-keyed JSON.
  const entries = Object.entries(value as Record<string, Json>);

  const sorted = entries.toSorted(([left], [right]) => left.localeCompare(right));

  return Object.fromEntries(sorted);
}

function keepFields(target: GraphTarget): GraphTarget {
  const kept = Object.entries(target).filter(([field]) => TARGET_FIELDS.has(field));

  return Object.fromEntries(kept);
}

/** The project's tags and targets as stable JSON text: behaviour-defining fields only, every key in order. */
export function snapshotProject(project: GraphProject): string {
  const declared = Object.entries(project.data.targets ?? {});
  const targets = declared.map(([name, target]): [string, GraphTarget] => [name, keepFields(target)]);
  const tags = [...(project.data.tags ?? [])].toSorted();

  const snapshot = { tags, targets: Object.fromEntries(targets) };

  return `${JSON.stringify(snapshot, sortedKeys, 2)}\n`;
}
