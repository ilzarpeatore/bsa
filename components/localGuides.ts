import { ResourceCategory } from '../api/resources';

// Guías estáticas compartidas por todos los usuarios (pedido explícito
// 2026-08-30) -- no vienen del backend de Recursos (api/resources.ts solo
// expone getList/getDetail, sin creación/edición), así que se listan aquí
// como metadatos locales fijos, en vez de en una pantalla/sección aparte.
// Fuente única compartida por resources_list_screen.tsx (pestaña
// "Compartidos") y home_screen_modern_v2.tsx (carrusel "Recursos") para no
// duplicar esta lista en dos sitios.
export interface LocalGuide {
  key: string;
  title: string;
  subtitle: string;
  category: ResourceCategory;
  screen: string;
  image: number;
}

export const LOCAL_GUIDES: LocalGuide[] = [
  {
    key: 'guide-autogestion',
    title: 'Guía de Autogestión',
    subtitle: 'Cómo leer y ejecutar tu plan de entrenamiento',
    category: 'entrenamiento',
    screen: 'MigratedAutogestionGuide',
    image: require('../assets/autogestion-guide-header.webp'),
  },
  {
    key: 'guide-overtraining',
    title: 'Guía de Sobrentrenamiento',
    subtitle: '¿Entrenas mucho o entrenas bien?',
    category: 'entrenamiento',
    screen: 'MigratedOvertrainingGuide',
    image: require('../assets/overtraining-guide-header.png'),
  },
  {
    key: 'guide-supplementation',
    title: 'Guía de Suplementación',
    subtitle: 'Evidencia, dosis y stacks por objetivo',
    category: 'nutricion',
    screen: 'MigratedSupplementationGuide',
    image: require('../assets/supplementation-guide-header.jpg'),
  },
  {
    key: 'guide-sleep',
    title: 'Guía de Sueño y Recuperación',
    subtitle: 'Tu músculo crece cuando descansas',
    category: 'habitos_mindset',
    screen: 'MigratedSleepGuide',
    image: require('../assets/sleep-guide-header.jpg'),
  },
  {
    key: 'guide-stress',
    title: 'Guía de Gestión del Estrés',
    subtitle: 'Cómo el cortisol frena tu progreso',
    category: 'habitos_mindset',
    screen: 'MigratedStressGuide',
    image: require('../assets/stress-guide-header.jpg'),
  },
  {
    key: 'guide-mindset',
    title: 'Manual de Mentalidad',
    subtitle: 'El músculo más importante',
    category: 'habitos_mindset',
    screen: 'MigratedMindsetGuide',
    image: require('../assets/mindset-guide-header.webp'),
  },
];
