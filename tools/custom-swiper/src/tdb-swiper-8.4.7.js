import Swiper, {
  A11y,
  Autoplay,
  Keyboard,
  Navigation,
  Pagination,
  Parallax,
} from 'swiper';

// Register only the modules used by the TDB highlight and parallax sliders.
Swiper.use([
  A11y,
  Autoplay,
  Keyboard,
  Navigation,
  Pagination,
  Parallax,
]);

window.Swiper = Swiper;
