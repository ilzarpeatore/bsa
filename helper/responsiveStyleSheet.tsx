import { useCallback, useMemo, DependencyList } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { NamedStyles } from './_types/responsiveStyleSheet.i';
/**
 * figmalayoudata
 * used for responsive design
 * @constant
 */
export const FigmaLayout = { w: 375, h: 812 };
/**
 * create responsive scale based on figma layout
 */
export const useScale = () => {
  const { width, height } = useWindowDimensions();
  const scaleWidth = width / FigmaLayout.w;
  const scaleHeight = height / FigmaLayout.h;
  const scale = Math.min(scaleWidth, scaleHeight);
  return scale;
};
const isObject = (myVar: any) => myVar && typeof myVar === 'object';
// Groups                     Size                   Func Factor
//                             1                      2    3
const validScaleSheetRegex = /^(\-?\d+(?:\.\d{1,3})?)@(ratio)(-r)?$/;
/**
 * create new stylesheet with responsive values based on figma values
 * added new size values types
 * @example
 * "48@ratio"
 */
export const useResponsiveStyleSheet = (
  styleSheet: NamedStyles<any>,
  // Deps extra para invalidar el cache cuando el objeto `styleSheet` embebe
  // valores que cambian sin que cambie `scale` -- p.ej. colores de
  // useAppColorMode() (`C`/`C_DARK`). `C` es una referencia estable entre
  // renders (memoizada en AppColorModeProvider), así que pasar `[C]` aquí
  // no rompe la memoización en cada render como sí lo haría añadir
  // `styleSheet` (objeto literal nuevo en cada render de quien llama).
  // Default `[]` mantiene el comportamiento exacto de antes para las
  // pantallas que no lo necesitan.
  extraDeps: DependencyList = []
) => {
  /**
   * deep map object and run function on object values
   */
  const DeepMap = useCallback((obj: any, fn: Function, scale: number): any => {
    const deepMapper = (val: any, key: string | number) =>
      isObject(val) ? DeepMap(val, fn, scale) : fn(key, val, scale);
    if (Array.isArray(obj)) {
      return obj.map(deepMapper);
    }
    if (isObject(obj)) {
      return mapObject(obj, deepMapper);
    }
    return obj;
  }, []);
  /**
   * map object to function
   */
  const mapObject = useCallback(
    (obj: any, fn: Function): any =>
      Object.keys(obj).reduce((res: any, key: string) => {
        res[key] = fn(obj[key], key);
        return res;
      }, {}),
    []
  );
  /**
   * recive stylesheet value , run regex and change the resuld and send it back
   * "any values with this pattern will be scaled"
   * [number|float]@[ratio](-r)
   * "-r flag will round the ratio values"
   * @example
   * "48@ratio"
   * "48.5@ratio"
   * "48.5@ratio-r"
   */
  const ScaleByAnnotation = useCallback(
    () => (key: number, value: string, scale: number) => {
      /**
       * check for pattern
       */
      if (!validScaleSheetRegex.test(value)) {
        return value;
      }
      /**
       * get group from pattern
       */
      const regexExecResult = validScaleSheetRegex.exec(value);

      let size = parseFloat(regexExecResult![1]);
      const shouldRound = typeof regexExecResult![3] != 'undefined'; // string or undefined
      /**
       * return value rounded or not based on -r flag
       */
      return shouldRound ? Math.round(scale * size) : Math.ceil(scale * size);
    },
    []
  );
  /**
   * create style
   */
  const scaleFunc = ScaleByAnnotation();
  const scale = useScale();
  // `styleSheet` y `scaleFunc` se recrean en cada render de quien llama a
  // este hook (objeto literal inline / cierre nuevo de ScaleByAnnotation()),
  // asi que añadirlos aqui anularia la memoizacion en cada pantalla que usa
  // este hook -- justo lo que existe para evitar. `scale` si es una
  // dependencia real (cambia con la rotacion via useWindowDimensions) y
  // faltaba, por eso el StyleSheet se quedaba con la escala vieja tras girar
  // el dispositivo.
  return useMemo(() => {
    return StyleSheet.create(DeepMap(styleSheet, scaleFunc, scale));
    // react-doctor-disable-next-line exhaustive-deps
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/use-memo -- extraDeps es de longitud variable a proposito (ver comentario del parametro)
  }, [scale, ...extraDeps]);
};
