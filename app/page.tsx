export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12">
      <section className="w-full max-w-3xl rounded-3xl bg-white p-8 shadow-sm ring-1 ring-black/5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-700">
          ANC Counseling
        </p>

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-zinc-950">
          Employee Documentation Portal
        </h1>

        <p className="mt-4 text-base leading-7 text-zinc-700">
          This site is used to create, review, sign, and finalize employee
          counseling documentation.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800"
          >
            Log In
          </a>

          <a
            href="/documentation"
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
          >
            View Documentation
          </a>
        </div>
      </section>
    </main>
  );
}