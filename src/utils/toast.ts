import Swal from 'sweetalert2';

export const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  // Tambahan agar warna progress bar dan icon senada dengan tema Evokasir (Hijau #0E5C37)
  iconColor: '#0E5C37',
  customClass: {
    popup: 'rounded-2xl shadow-xl border border-stone-100',
    title: 'text-sm font-bold text-stone-800 font-sans',
    timerProgressBar: 'bg-[#0E5C37]'
  },
  didOpen: (toast) => {
    toast.onmouseenter = Swal.stopTimer;
    toast.onmouseleave = Swal.resumeTimer;
  }
});