import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

interface AnalysisSummary {
  id: number;
  repositoryFullName: string;
  pullRequestNumber: number;
  headSha: string;
  breakingChanges: number;
  impactedConsumers: number;
  createdAt: string;
}

interface AnalysisPage {
  analyses: AnalysisSummary[];
  nextBefore: number | null;
}

const findingGroups = {
  removedEndpoints: "Removed endpoints",
  removedResponseFields: "Removed response fields",
  responseTypeChanges: "Response type changes",
  newRequiredRequestFields: "New required request fields",
  removedStatusCodes: "Removed response status codes",
  impactedConsumers: "Impacted consumer references",
};

interface Analysis extends AnalysisSummary {
  baseSha: string;
  aiExplanation: string | null;
  result: Record<
    keyof typeof findingGroups,
    (string | Record<string, unknown>)[]
  >;
}

const dateFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

async function getJson<T>(path: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}

function useQuery<T>(path: string) {
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ data?: T; error?: boolean }>({});

  useEffect(() => {
    const controller = new AbortController();
    setResult({});
    getJson<T>(path, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ data });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ error: true });
      });
    return () => controller.abort();
  }, [path, retry]);

  return { ...result, retry: () => setRetry((attempt) => attempt + 1) };
}

function LoadError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="notice" role="alert">
      <p>{message}</p>
      <button onClick={retry}>Try again</button>
    </div>
  );
}

function Findings({ analysis }: { analysis: Analysis }) {
  return (
    <>
      {Object.entries(findingGroups).map(([key, label]) => {
        const findings =
          analysis.result[key as keyof typeof findingGroups] ?? [];
        return (
          <details key={key} className="findings">
            <summary>
              {label} <span>{findings.length}</span>
            </summary>
            {findings.length === 0 ? (
              <p className="muted">None detected.</p>
            ) : (
              <ul>
                {findings.map((finding, index) => (
                  <li key={index}>
                    {typeof finding === "string" ? (
                      <code>{finding}</code>
                    ) : (
                      <dl>
                        {Object.entries(finding).map(([field, value]) => (
                          <div key={field}>
                            <dt>{field.replace(/([A-Z])/g, " $1")}</dt>
                            <dd>
                              {typeof value === "string"
                                ? value
                                : JSON.stringify(value)}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </details>
        );
      })}
    </>
  );
}

function AnalysisDetail({ id }: { id: number }) {
  const { data, error, retry } = useQuery<Analysis>(`/api/analyses/${id}`);

  if (error)
    return <LoadError message="Couldn’t load this analysis." retry={retry} />;
  if (!data)
    return (
      <p role="status" className="notice">
        Loading analysis…
      </p>
    );

  return (
    <article className="detail">
      <div className="revision">
        <a
          href={`https://github.com/${data.repositoryFullName}/pull/${data.pullRequestNumber}`}
        >
          View pull request
        </a>
        <dl>
          <div>
            <dt>Base commit</dt>
            <dd>
              <code>{data.baseSha}</code>
            </dd>
          </div>
          <div>
            <dt>Head commit</dt>
            <dd>
              <code>{data.headSha}</code>
            </dd>
          </div>
        </dl>
      </div>
      <Findings analysis={data} />
      {data.aiExplanation && (
        <section className="explanation">
          <h2>AI explanation</h2>
          <p>{data.aiExplanation}</p>
        </section>
      )}
    </article>
  );
}

function History({
  before,
  previous,
  next,
}: {
  before: number | null;
  previous: (() => void) | undefined;
  next: (cursor: number) => void;
}) {
  const [selected, setSelected] = useState<number>();
  const suffix = before === null ? "" : `?before=${before}`;
  const { data, error, retry } = useQuery<AnalysisPage>(
    `/api/analyses${suffix}`,
  );
  const nextBefore = data?.nextBefore ?? null;

  return (
    <section aria-label="Analysis history">
      <div className="columns column-heading" aria-hidden="true">
        <span>Pull request</span>
        <span>Breaking</span>
        <span>Consumer refs</span>
        <span>Analyzed</span>
      </div>
      {error && (
        <LoadError message="Couldn’t load analysis history." retry={retry} />
      )}
      {!data && !error && (
        <p className="notice" role="status">
          Loading analyses…
        </p>
      )}
      {data?.analyses.length === 0 && (
        <div className="notice">
          <h2>No analyses yet</h2>
          <p>Completed GitHub pull request analyses appear here.</p>
          <button onClick={retry}>Refresh history</button>
        </div>
      )}
      {data?.analyses.map((analysis) => (
        <div key={analysis.id} className="record">
          <button
            className="columns record-button"
            aria-expanded={selected === analysis.id}
            aria-controls={`analysis-${analysis.id}`}
            onClick={() =>
              setSelected(selected === analysis.id ? undefined : analysis.id)
            }
          >
            <span>
              <strong>
                {analysis.repositoryFullName} #{analysis.pullRequestNumber}
              </strong>
              <code>{analysis.headSha.slice(0, 8)}</code>
            </span>
            <span className={analysis.breakingChanges ? "breaking" : ""}>
              <span className="sr-only">Breaking changes: </span>
              {analysis.breakingChanges}
            </span>
            <span>
              <span className="sr-only">Consumer references: </span>
              {analysis.impactedConsumers}
            </span>
            <time dateTime={analysis.createdAt}>
              {dateFormat.format(new Date(analysis.createdAt))}
            </time>
          </button>
          <div id={`analysis-${analysis.id}`} hidden={selected !== analysis.id}>
            {selected === analysis.id && <AnalysisDetail id={analysis.id} />}
          </div>
        </div>
      ))}
      {(previous || nextBefore !== null) && (
        <nav aria-label="History pages">
          <button disabled={!previous} onClick={previous}>
            Newer
          </button>
          <button
            disabled={nextBefore === null}
            onClick={() => nextBefore !== null && next(nextBefore)}
          >
            Older
          </button>
        </nav>
      )}
    </section>
  );
}

function App() {
  const [cursors, setCursors] = useState<number[]>([]);
  const [refresh, setRefresh] = useState(0);
  const before = cursors.at(-1) ?? null;

  return (
    <>
      <header className="masthead">
        <span className="mark" aria-hidden="true">
          ⌁
        </span>{" "}
        API Impact Analyser
      </header>
      <main>
        <div className="title">
          <h1>Pull request analyses</h1>
          <button
            onClick={() => {
              setCursors([]);
              setRefresh((value) => value + 1);
            }}
          >
            Refresh
          </button>
        </div>
        <History
          key={`${before}-${refresh}`}
          before={before}
          previous={
            cursors.length ? () => setCursors(cursors.slice(0, -1)) : undefined
          }
          next={(cursor) => setCursors([...cursors, cursor])}
        />
      </main>
    </>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
