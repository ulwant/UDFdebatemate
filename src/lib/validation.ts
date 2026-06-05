export type ValidationResult = {
  ok: boolean;
  message?: string;
};

export function required(value: string | null | undefined, label: string): ValidationResult {
  return value?.trim() ? { ok: true } : { ok: false, message: `${label} wajib diisi.` };
}

export function noWhitespace(value: string | null | undefined, label: string): ValidationResult {
  return value && /\s/.test(value) ? { ok: false, message: `${label} tidak boleh mengandung spasi.` } : { ok: true };
}

export function fileIsImage(file: File, label = 'File'): ValidationResult {
  return file.type.startsWith('image/') ? { ok: true } : { ok: false, message: `${label} harus berupa gambar.` };
}

export function maxFileSize(file: File, maxMb: number, label = 'File'): ValidationResult {
  return file.size <= maxMb * 1024 * 1024 ? { ok: true } : { ok: false, message: `${label} maksimal ${maxMb}MB.` };
}

export function combineValidations(...checks: ValidationResult[]): ValidationResult {
  return checks.find((check) => !check.ok) || { ok: true };
}

