// Moves issues on the "Pioneer" project board as work happens. Run by
// .github/workflows/project-status.yml through actions/github-script, with a
// token that has the `project` scope (user projects are not reachable with
// GITHUB_TOKEN).
//
//   issue opened                      -> Backlog
//   issue reopened                    -> Ready (Backlog if still blocked)
//   issue closed                      -> Done, and dependents whose blockers are all closed -> Ready
//   PR opened as draft / to draft     -> linked issues In progress
//   PR opened / ready for review      -> linked issues In review
//   review requests changes           -> linked issues back to In progress
//   PR merged                         -> linked issues Done
//   PR closed unmerged                -> linked issues back to Ready
//   linked issue starts work          -> its parent epic In progress
//   manual run (workflow_dispatch)    -> reconcile: closed -> Done, unblocked Backlog -> Ready
//
// "Linked" means the PR closes the issue (Closes #N, or linked in the sidebar).

const PROJECT_OWNER = 'DavidDudson';
const PROJECT_NUMBER = 2;

const Status = {
  Backlog: 'Backlog',
  Ready: 'Ready',
  InProgress: 'In progress',
  InReview: 'In review',
  Done: 'Done',
};
const RANK = [Status.Backlog, Status.Ready, Status.InProgress, Status.InReview, Status.Done];
const rank = (status) => (status === null ? -1 : RANK.indexOf(status));

module.exports = async ({ github, context, core }) => {
  const { owner, repo } = context.repo;
  const project = await loadProject(github);

  async function itemFor(contentId) {
    const { node } = await github.graphql(
      `query($id: ID!) {
        node(id: $id) {
          ... on Issue {
            projectItems(first: 50) {
              nodes {
                id
                project { id }
                fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } }
              }
            }
          }
        }
      }`,
      { id: contentId },
    );
    const item = node.projectItems.nodes.find((n) => n.project.id === project.id);
    if (item) {
      return { id: item.id, status: item.fieldValueByName?.name ?? null };
    }
    const added = await github.graphql(
      `mutation($project: ID!, $content: ID!) {
        addProjectV2ItemById(input: { projectId: $project, contentId: $content }) { item { id } }
      }`,
      { project: project.id, content: contentId },
    );
    return { id: added.addProjectV2ItemById.item.id, status: null };
  }

  /**
   * Set an issue's status. `when` decides whether the move is allowed given the
   * current status: by default only forward moves happen, so automation never
   * drags a card backwards over a manual change.
   */
  async function move(issue, target, when = (current) => rank(target) > rank(current)) {
    const item = await itemFor(issue.node_id ?? issue.id);
    if (item.status === target || !when(item.status)) {
      core.info(`#${issue.number}: stays ${item.status ?? 'unset'} (wanted ${target})`);
      return false;
    }
    await github.graphql(
      `mutation($project: ID!, $item: ID!, $field: ID!, $option: String!) {
        updateProjectV2ItemFieldValue(input: {
          projectId: $project, itemId: $item, fieldId: $field, value: { singleSelectOptionId: $option }
        }) { projectV2Item { id } }
      }`,
      { project: project.id, item: item.id, field: project.statusField, option: project.options[target] },
    );
    core.info(`#${issue.number}: ${item.status ?? 'unset'} -> ${target}`);
    return true;
  }

  async function openBlockers(number) {
    const { data } = await github.request('GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by', {
      owner,
      repo,
      issue_number: number,
    });
    return data.filter((blocker) => blocker.state === 'open');
  }

  async function unblockDependents(number) {
    const { data } = await github.request('GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocking', {
      owner,
      repo,
      issue_number: number,
    });
    for (const dependent of data.filter((d) => d.state === 'open')) {
      if ((await openBlockers(dependent.number)).length === 0) {
        await move(dependent, Status.Ready, (current) => current === null || current === Status.Backlog);
      }
    }
  }

  async function startParent(issueId) {
    const { node } = await github.graphql(
      `query($id: ID!) { node(id: $id) { ... on Issue { parent { id number state } } } }`,
      { id: issueId },
    );
    const parent = node.parent;
    if (parent && parent.state === 'OPEN') {
      await move(parent, Status.InProgress);
    }
  }

  async function linkedIssues(prNumber) {
    const { repository } = await github.graphql(
      `query($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          pullRequest(number: $number) {
            closingIssuesReferences(first: 20) { nodes { id number state } }
          }
        }
      }`,
      { owner, repo, number: prNumber },
    );
    return repository.pullRequest.closingIssuesReferences.nodes.filter((issue) => issue.state === 'OPEN');
  }

  /** Repair drift: closed issues to Done, unblocked Backlog issues to Ready. */
  async function reconcile() {
    let after = null;
    do {
      const { user } = await github.graphql(
        `query($owner: String!, $number: Int!, $after: String) {
          user(login: $owner) {
            projectV2(number: $number) {
              items(first: 100, after: $after) {
                pageInfo { hasNextPage endCursor }
                nodes { content { ... on Issue { id number state repository { nameWithOwner } } } }
              }
            }
          }
        }`,
        { owner: PROJECT_OWNER, number: PROJECT_NUMBER, after },
      );
      const page = user.projectV2.items;
      for (const { content: issue } of page.nodes) {
        if (!issue?.number || issue.repository.nameWithOwner !== `${owner}/${repo}`) {
          continue;
        }
        if (issue.state === 'CLOSED') {
          await move(issue, Status.Done, () => true);
        } else if ((await openBlockers(issue.number)).length === 0) {
          await move(issue, Status.Ready, (current) => current === null || current === Status.Backlog);
        }
      }
      after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
    } while (after);
  }

  const { eventName, payload } = context;

  if (eventName === 'workflow_dispatch') {
    await reconcile();
    return;
  }

  if (eventName === 'issues') {
    const issue = payload.issue;
    switch (payload.action) {
      case 'opened':
        await move(issue, Status.Backlog, (current) => current === null);
        return;
      case 'reopened': {
        const blocked = (await openBlockers(issue.number)).length > 0;
        await move(issue, blocked ? Status.Backlog : Status.Ready, () => true);
        return;
      }
      case 'closed':
        await move(issue, Status.Done, () => true);
        await unblockDependents(issue.number);
        return;
      default:
        return;
    }
  }

  const pr = payload.pull_request;
  if (!pr) {
    return;
  }
  const issues = await linkedIssues(pr.number);
  if (issues.length === 0) {
    core.info(`PR #${pr.number} closes no open issues; nothing to move`);
    return;
  }

  let target;
  let when;
  if (eventName === 'pull_request_review') {
    if (payload.review.state !== 'changes_requested') {
      return;
    }
    target = Status.InProgress;
    when = (current) => current === Status.InReview;
  } else {
    switch (payload.action) {
      case 'opened':
      case 'reopened':
      case 'edited':
      case 'ready_for_review':
        target = pr.draft ? Status.InProgress : Status.InReview;
        break;
      case 'converted_to_draft':
        target = Status.InProgress;
        when = (current) => current === Status.InReview;
        break;
      case 'closed':
        if (pr.merged) {
          target = Status.Done;
        } else {
          target = Status.Ready;
          when = (current) => current === Status.InProgress || current === Status.InReview;
        }
        break;
      default:
        return;
    }
  }

  for (const issue of issues) {
    const moved = await move(issue, target, when);
    if (moved && (target === Status.InProgress || target === Status.InReview)) {
      await startParent(issue.id);
    }
  }
};

async function loadProject(github) {
  const { user } = await github.graphql(
    `query($owner: String!, $number: Int!) {
      user(login: $owner) {
        projectV2(number: $number) {
          id
          field(name: "Status") { ... on ProjectV2SingleSelectField { id options { id name } } }
        }
      }
    }`,
    { owner: PROJECT_OWNER, number: PROJECT_NUMBER },
  );
  const project = user.projectV2;
  const options = Object.fromEntries(project.field.options.map((option) => [option.name, option.id]));
  for (const status of RANK) {
    if (!options[status]) {
      throw new Error(`Project status option "${status}" is missing`);
    }
  }
  return { id: project.id, statusField: project.field.id, options };
}
