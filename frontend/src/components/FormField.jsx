function FormField({ id, label, type = 'text', value, onChange, required, placeholder, min, minLength, pattern, autoComplete }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700">{label}</label>
      <input
        id={id}
        type={type}
        required={required}
        placeholder={placeholder}
        min={min}
        minLength={minLength}
        pattern={pattern}
        autoComplete={autoComplete}
        value={value}
        onChange={onChange}
        className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 focus:outline-none focus:border-neutral-900"
      />
    </div>
  );
}

export default FormField;
