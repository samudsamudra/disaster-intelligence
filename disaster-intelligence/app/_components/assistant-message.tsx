
    import ReactMarkdown from "react-markdown";
    import remarkGfm from "remark-gfm";

    type AssistantMessageProps = {
    content: string;
    };

    export default function AssistantMessage({
    content,
    }: AssistantMessageProps) {
    return (
        <article className="assistant-markdown min-w-0 break-words text-sm leading-7 text-neutral-800">
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
            h1: ({ children }) => (
                <h1 className="mb-3 mt-6 text-xl font-bold tracking-tight text-neutral-950 first:mt-0">
                {children}
                </h1>
            ),

            h2: ({ children }) => (
                <h2 className="mb-3 mt-5 text-lg font-semibold tracking-tight text-neutral-950 first:mt-0">
                {children}
                </h2>
            ),

            h3: ({ children }) => (
                <h3 className="mb-2 mt-4 text-base font-semibold text-neutral-950">
                {children}
                </h3>
            ),

            p: ({ children }) => (
                <p className="mb-3 leading-7 last:mb-0">
                {children}
                </p>
            ),

            strong: ({ children }) => (
                <strong className="font-semibold text-black">
                {children}
                </strong>
            ),

            em: ({ children }) => (
                <em className="italic text-neutral-900">
                {children}
                </em>
            ),

            ul: ({ children }) => (
                <ul className="mb-4 ml-5 list-disc space-y-2 marker:text-red-800">
                {children}
                </ul>
            ),

            ol: ({ children }) => (
                <ol className="mb-4 ml-5 list-decimal space-y-2 marker:font-semibold marker:text-red-800">
                {children}
                </ol>
            ),

            li: ({ children }) => (
                <li className="pl-1 leading-7">
                {children}
                </li>
            ),

            blockquote: ({ children }) => (
                <blockquote className="my-4 border-l-2 border-red-500 bg-neutral-100 py-2 pl-4 pr-3 text-neutral-700">
                {children}
                </blockquote>
            ),

            a: ({ href, children }) => {
                const safeHref =
                href &&
                (href.startsWith("https://") ||
                    href.startsWith("http://") ||
                    href.startsWith("mailto:"))
                    ? href
                    : undefined;

                return (
                <a
                    href={safeHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-red-800 underline decoration-red-400/40 underline-offset-4 transition-colors hover:text-red-900"
                >
                    {children}
                </a>
                );
            },

            hr: () => (
                <hr className="my-5 border-neutral-300" />
            ),

            code: ({ children, className }) => {
                const isBlock = className?.includes("language-");

                return (
                <code
                    className={
                    isBlock
                        ? "font-mono text-xs leading-6"
                        : "rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[0.85em] text-red-900"
                    }
                >
                    {children}
                </code>
                );
            },

            pre: ({ children }) => (
                <pre className="my-4 max-w-full overflow-x-auto rounded-lg border border-neutral-300 bg-neutral-100 p-4 text-xs leading-6 text-neutral-900">
                {children}
                </pre>
            ),

            table: ({ children }) => (
                <div className="my-4 max-w-full overflow-x-auto rounded-lg border border-neutral-300">
                <table className="w-full border-collapse text-left text-xs">
                    {children}
                </table>
                </div>
            ),

            thead: ({ children }) => (
                <thead className="bg-neutral-100 text-neutral-950">
                {children}
                </thead>
            ),

            tbody: ({ children }) => (
                <tbody className="divide-y divide-neutral-200">
                {children}
                </tbody>
            ),

            tr: ({ children }) => (
                <tr className="border-b border-neutral-300 last:border-0">
                {children}
                </tr>
            ),

            th: ({ children }) => (
                <th className="whitespace-nowrap px-3 py-2 font-semibold">
                {children}
                </th>
            ),

            td: ({ children }) => (
                <td className="px-3 py-2 align-top text-neutral-800">
                {children}
                </td>
            ),
            }}
        >
            {content}
        </ReactMarkdown>
        </article>
    );
    }
