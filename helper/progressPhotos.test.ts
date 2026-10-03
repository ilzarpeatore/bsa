import type { ProgressPhoto } from '../api/progressPhotos';
import {
  groupByDate,
  latestOfPose,
  defaultComparison,
  photoFor,
  metricNear,
  metricChanges,
  daysBetween,
  dateFromExif,
} from './progressPhotos';

const photo = (id: number, pose: ProgressPhoto['pose'], taken_at: string): ProgressPhoto => ({
  id,
  pose,
  taken_at,
  url: `https://x/${id}`,
  created_at: `${taken_at}T10:00:00Z`,
});

const photos = [
  photo(1, 'back', '2026-07-01'),
  photo(2, 'front', '2026-07-01'),
  photo(3, 'side', '2026-07-01'),
  photo(4, 'front', '2026-08-15'),
  photo(5, 'front', '2026-09-30'),
  photo(6, 'side', '2026-09-30'),
];

describe('progressPhotos helpers', () => {
  it('agrupa por fecha, más reciente primero y en orden frente/perfil/espalda', () => {
    const sessions = groupByDate(photos);
    expect(sessions.map((s) => s.date)).toEqual(['2026-09-30', '2026-08-15', '2026-07-01']);
    expect(sessions[2].photos.map((p) => p.pose)).toEqual(['front', 'side', 'back']);
  });

  it('la foto anterior de una pose es la más reciente de esa pose', () => {
    expect(latestOfPose(photos, 'front')?.id).toBe(5);
    expect(latestOfPose(photos, 'back')?.id).toBe(1);
    expect(latestOfPose([], 'front')).toBeNull();
  });

  it('el comparador arranca con la primera y la última fecha de la pose', () => {
    expect(defaultComparison(photos, 'front')).toEqual({
      before: '2026-07-01',
      after: '2026-09-30',
    });
    expect(defaultComparison(photos, 'back')).toBeNull();
    expect(photoFor(photos, 'side', '2026-09-30')?.id).toBe(6);
  });

  it('usa la medida más cercana a cada fecha (±14 días) y calcula el cambio', () => {
    const chart = {
      weight: {
        unit: 'kg',
        data: [
          { id: 1, value: 84.2, date: '2026-07-03', source: 'client' as const, notes: null },
          { id: 2, value: 80.0, date: '2026-09-28', source: 'client' as const, notes: null },
        ],
      },
      waist: {
        unit: 'cm',
        data: [{ id: 3, value: 90, date: '2026-05-01', source: 'client' as const, notes: null }],
      },
    };
    expect(metricNear(chart, 'weight', '2026-07-01')).toBe(84.2);
    expect(metricNear(chart, 'waist', '2026-07-01')).toBeNull();
    expect(metricChanges(chart, '2026-07-01', '2026-09-30')).toEqual([
      { key: 'weight', label: 'Peso', unit: 'kg', before: 84.2, after: 80, delta: -4.2 },
    ]);
  });

  it('días entre fechas y fecha EXIF de la galería', () => {
    expect(daysBetween('2026-07-01', '2026-09-30')).toBe(91);
    expect(dateFromExif({ DateTimeOriginal: '2026:09:01 10:20:00' })).toBe('2026-09-01');
    expect(dateFromExif({})).toBeNull();
    expect(dateFromExif(undefined)).toBeNull();
  });
});
