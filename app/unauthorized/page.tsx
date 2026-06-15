export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="max-w-md rounded-2xl border bg-white p-8 shadow-sm text-center">
        <h1 className="text-2xl font-semibold text-slate-900">
          Access Restricted
        </h1>

        <p className="mt-4 text-slate-600">
          You do not have access to this ANC System.
        </p>
      </div>
    </main>
  );
}