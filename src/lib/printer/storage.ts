import { PrinterDevice } from "./types";

const KEY = "ekasir_printer";

export const PrinterStorage = {
  save(printer: PrinterDevice) {
    localStorage.setItem(
      KEY,
      JSON.stringify(printer)
    );
  },

  get(): PrinterDevice | null {
    const data = localStorage.getItem(KEY);

    if (!data) return null;

    return JSON.parse(data);
  },

  remove() {
    localStorage.removeItem(KEY);
  }
};