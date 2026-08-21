function BackendDataPending({ title }) {
  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
      <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-5">
        <p className="font-medium text-neutral-900">Your account is connected.</p>
        <p className="mt-2 text-sm text-neutral-600">
          Live business data will appear here when the business dashboard is connected
          to the backend in Phase 7.
        </p>
      </div>
    </div>
  );
}

export default BackendDataPending;
