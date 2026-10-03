import React from 'react';
import { ScrollView } from 'react-native';
import { Box } from '@components/ui/box';
import { Text } from '@components/ui/text';
import { Icon } from '@components/ui/icon';
import { Button, ButtonText } from '@components/ui/button';
import SimpleBottomSheet from '@components/SimpleBottomSheet';
import { useAppColorMode } from '@helper/useAppColorMode';

// Guía «Cómo hacer tus fotos» (icono ⓘ de Fotos de progreso y de la cámara).
// Pedido de Hamza (2026-10-03): que las fotos se hagan siempre igual --
// mismo sitio, distancia, hora y luz -- para que el antes/después compare el
// cuerpo y no las condiciones.
export const PHOTO_GUIDE: { icon: string; title: string; text: string }[] = [
  {
    icon: 'location-outline',
    title: 'Mismo sitio',
    text: 'Siempre en el mismo lugar, con una pared o fondo liso detrás y sin objetos alrededor.',
  },
  {
    icon: 'resize-outline',
    title: 'Misma distancia y altura',
    text: 'Apoya el móvil en vertical a la altura de la cintura, a unos 2 metros. Marca con cinta en el suelo dónde pones el móvil y dónde te colocas tú.',
  },
  {
    icon: 'time-outline',
    title: 'Misma hora',
    text: 'Por la mañana, en ayunas y antes de entrenar. La comida, el agua y el bombeo cambian mucho el aspecto.',
  },
  {
    icon: 'sunny-outline',
    title: 'Misma luz',
    text: 'Luz de frente y sin contraluz (no te pongas delante de una ventana). Si usas luz artificial, siempre la misma lámpara. Sin flash.',
  },
  {
    icon: 'shirt-outline',
    title: 'Misma ropa',
    text: 'Ropa interior, bañador o ropa ajustada, y siempre la misma, para que se vea la silueta.',
  },
  {
    icon: 'body-outline',
    title: 'Mismas poses',
    text: 'Frente, perfil (siempre el mismo lado) y espalda. De pie, relajado, brazos un poco separados del cuerpo. Sin apretar ni meter tripa.',
  },
  {
    icon: 'layers-outline',
    title: 'Usa la foto anterior',
    text: 'La cámara muestra tu última foto en transparencia: encaja tu silueta con ella. Usa el temporizador para colocarte sin prisas.',
  },
  {
    icon: 'calendar-outline',
    title: 'Cada 2-4 semanas',
    text: 'El mismo día de la semana. A diario los cambios no se ven y desmotiva.',
  },
  {
    icon: 'color-filter-outline',
    title: 'Sin filtros ni zoom',
    text: 'Ni filtros, ni retoques, ni zoom: la foto tal cual.',
  },
];

// Contenido de la guía, reutilizable fuera de la hoja: dentro del <Modal> de
// la cámara la hoja (portal de Gluestack, montado en la raíz de la app)
// quedaría debajo del Modal nativo, así que PoseCamera pinta esto en un panel.
export function PhotoGuideContent({
  onClose,
  maxHeight = 460,
}: {
  onClose: () => void;
  maxHeight?: number;
}) {
  const { colors: C } = useAppColorMode();
  return (
    <>
      <Text weight="bold" size="lg" style={{ marginBottom: 4 }}>
        Cómo hacer tus fotos
      </Text>
      <Text size="sm" muted style={{ marginBottom: 14 }}>
        Para que el antes y después muestre tu cambio real, repite siempre las mismas condiciones.
      </Text>
      <ScrollView style={{ maxHeight }} showsVerticalScrollIndicator={false}>
        {PHOTO_GUIDE.map((tip) => (
          <Box key={tip.title} className="flex-row" style={{ gap: 12, marginBottom: 14 }}>
            <Box
              className="items-center justify-center rounded-full"
              style={{ width: 34, height: 34, backgroundColor: C.gray5 }}>
              <Icon name={tip.icon as any} size={18} color={C.orange} />
            </Box>
            <Box style={{ flex: 1 }}>
              <Text weight="bold" size="sm">
                {tip.title}
              </Text>
              <Text size="sm" muted style={{ lineHeight: 19, marginTop: 2 }}>
                {tip.text}
              </Text>
            </Box>
          </Box>
        ))}
        <Box
          className="flex-row items-start rounded-sm"
          style={{ gap: 8, backgroundColor: C.gray5, padding: 10, marginBottom: 12 }}>
          <Icon name="lock-closed-outline" size={16} color={C.gray40} />
          <Text size="xs" muted style={{ flex: 1, lineHeight: 17 }}>
            Tus fotos son privadas: solo las ves tú y tu coach. No se guardan en el carrete del
            móvil.
          </Text>
        </Box>
      </ScrollView>
      <Button radius="pill" className="py-3" onPress={onClose}>
        <ButtonText>Entendido</ButtonText>
      </Button>
    </>
  );
}

export default function PhotoGuideSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  return (
    <SimpleBottomSheet visible={visible} onClose={onClose}>
      <PhotoGuideContent onClose={onClose} />
    </SimpleBottomSheet>
  );
}
