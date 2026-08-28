# Política de privacidad

**Fuente de verdad:** este documento es la copia versionada del texto que el usuario ha confirmado como definitivo (2026-08-28) para publicar en `https://bestronger.es/privacy-policy/`, la URL que abre `pages/migrated/privacy_policy_screen.tsx` (ver `PRIVACY_POLICY_URL` en `constants/appLinks.ts`) y la que hay que dar de alta en App Store Connect/Play Console. **No es contenido embebido en la app** — la app abre la URL en vivo, este fichero es solo referencia para que el código y el texto legal no se desincronicen sin que nadie se dé cuenta (ver `docs/BORRADO_CUENTA_BACKEND.md`, que ya depende del compromiso de borrado definitivo de este texto). Si el texto publicado en la web cambia, actualizar este fichero a la vez.

---

Última actualización: 28 ago 2026

## Responsable del tratamiento

- Denominación comercial: BeStronger
- Titular: Hamza Elouafa Lafjare
- NIF: 17575419S
- Domicilio: Plaza de Paris 1, 2C, 28943 Fuenlabrada, Madrid, España
- Correo de contacto para asuntos de privacidad: contacto@bestronger.es

Esta política describe cómo BeStronger recoge, utiliza, conserva y protege los datos personales de sus usuarios, en cumplimiento del Reglamento (UE) 2016/679 (RGPD) y de la Ley Orgánica 3/2018 (LOPDGDD). Parte de los datos tratados son datos relativos a la salud (categoría especial de datos del artículo 9 RGPD), a los que se presta especial atención a lo largo de este documento.

## Qué información recogemos

- Datos de cuenta: nombre, email y contraseña (almacenada cifrada)
- Datos personales y de salud del cuestionario inicial: sexo, edad, altura, peso, y respuestas del cuestionario PAR-Q sobre tu condición física y de salud
- Actividad de entrenamiento: series, cargas, repeticiones, RIR/RPE, dolor reportado (zona, tipo e intensidad) y feedback
- Actividad de nutrición: comidas registradas, calorías y macros
- Hábitos, rachas y chequeos diarios de preparación (sueño, energía, estrés, agujetas)
- Datos de Apple Health/HealthKit y Health Connect: pasos, frecuencia cardiaca y sueño, solo si conectas tu cuenta — ver la sección dedicada más abajo
- Datos técnicos y de uso de la app para su correcto funcionamiento
- Contenido que publicas voluntariamente en la comunidad (publicaciones, comentarios, "me gusta")

## Para qué usamos tus datos

Usamos esta información para que tu coach pueda diseñar y ajustar tu plan de entrenamiento y nutrición, gestionar tu suscripción y facturación, hacer funcionar la comunidad y el soporte, cumplir obligaciones legales y mantener la app segura. No recogemos datos para fines ajenos al servicio.

El tratamiento de tus datos de salud (cuestionario inicial y datos de Apple Health/Health Connect) se basa en tu consentimiento explícito, ya que se trata de una categoría especial de datos (artículo 9.2.a RGPD). Puedes retirar ese consentimiento en cualquier momento, tal y como se explica más abajo.

## Datos de Apple Health/HealthKit y Health Connect

- Si lo autorizas, la app lee de Apple Health/HealthKit (iOS) o Health Connect (Android) exclusivamente pasos, frecuencia cardiaca y sueño, con la única finalidad de dar contexto adicional a tu coach a la hora de ajustar tu plan — nunca con fines comerciales o publicitarios.
- No accedemos a ningún dato de Apple Health o Health Connect hasta que tú concedes expresamente el permiso desde el propio sistema operativo. Si no lo concedes, la app funciona igual con lo que introduzcas manualmente.
- Puedes revocar el permiso cuando quieras desde los ajustes de tu dispositivo (Ajustes → Privacidad y seguridad → Salud en iOS; la app Health Connect en Android), fuera de BeStronger. La revocación detiene la lectura de nuevos datos desde ese momento.
- Solo leemos estos datos: nunca escribimos, modificamos ni eliminamos nada en Apple Health o Health Connect.
- No usamos los datos de Apple Health/HealthKit ni de Health Connect para publicidad, marketing ni analítica de terceros, ni los vendemos, cedemos o transferimos a plataformas publicitarias, brokers de datos o revendedores de información — ni nosotros ni terceros. Se usan exclusivamente para el fin descrito en este apartado.

> **Nota técnica (no forma parte del texto legal, ver `docs/PENDIENTE_BACKEND_ADMIN.md`):** este párrafo solo declara pasos/frecuencia cardiaca/sueño, pero `helper/health.ts` (`requestHealthPermissions()`) pide permiso también de HRV y frecuencia cardiaca en reposo (para el motor de readiness) y de hidratación — hay que ampliar este texto o estrechar el permiso solicitado antes de reactivar la integración de Salud, que hoy está deshabilitada para esta versión.

## Con quién compartimos tu información

- Tu coach accede a tus datos de entrenamiento, nutrición y salud para diseñar y ajustar tu plan — es parte esencial del servicio, no una cesión a terceros.
- No vendemos, alquilamos ni cedemos tus datos personales a terceras empresas con fines comerciales o publicitarios. No compartimos tus datos con anunciantes, redes publicitarias ni brokers de datos, y no existen integraciones con otras apps de terceros que accedan a tus datos personales.
- Los únicos terceros que pueden llegar a procesar tus datos son los proveedores de infraestructura técnica estrictamente necesarios para operar el servicio (por ejemplo, alojamiento en la nube), que actúan como encargados de tratamiento bajo contrato, siguiendo nuestras instrucciones y sin usar tus datos para fines propios. También podemos compartir información cuando la ley lo exija, o para proteger la seguridad de los usuarios y de la plataforma.
  - Con tu coach, para diseñar y ajustar tu plan
  - Con proveedores de alojamiento e infraestructura técnica, como encargados de tratamiento
  - Para cumplir con obligaciones legales
  - Para proteger la seguridad de los usuarios y de la plataforma

## Cuánto tiempo conservamos tus datos

Conservamos tus datos mientras mantengas una cuenta activa. Tras la baja, los conservamos bloqueados durante los plazos exigidos por ley (por ejemplo, obligaciones fiscales) y los eliminamos de forma definitiva una vez transcurridos.

## Cómo eliminar tu cuenta y tus datos

Puedes eliminar tu cuenta y los datos asociados directamente desde la app, en los ajustes de tu perfil. Al confirmar la eliminación, tu cuenta y tus datos personales (incluidos los del cuestionario de salud y los sincronizados desde Apple Health/Health Connect) se borran de forma definitiva, salvo la información que estemos obligados a conservar por ley durante el plazo legal correspondiente (por ejemplo, facturas por obligaciones fiscales).

Si prefieres solicitarlo por otra vía, o tienes cualquier problema para hacerlo desde la app, también puedes pedirnos la eliminación de tu cuenta escribiendo a contacto@bestronger.es.

> **Nota técnica:** este compromiso ("se borran de forma definitiva" al confirmar) es lo que fija la estrategia de implementación en `docs/BORRADO_CUENTA_BACKEND.md` — no cabe un "periodo de gracia recuperable" ofrecido al usuario, solo un margen técnico interno invisible si hiciera falta por motivos operativos.

## Tus derechos

Puedes ejercer en cualquier momento, de forma gratuita, tus derechos de acceso, rectificación, supresión, limitación, portabilidad y oposición, y retirar tu consentimiento (incluido el del cuestionario de salud y la sincronización con Apple Health/Health Connect) sin que afecte a la licitud del tratamiento previo.

Escríbenos a contacto@bestronger.es indicando el derecho que quieres ejercer. También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es) si consideras que no hemos tratado tus datos correctamente.

## Seguridad

Aplicamos medidas técnicas y organizativas apropiadas para proteger tus datos, incluidos los de salud, frente a accesos no autorizados, pérdida o divulgación indebida — entre ellas, cifrado de contraseñas y acceso del coach limitado únicamente a los datos de sus propios clientes.

## Menores de edad

El servicio está dirigido a mayores de 18 años. No recabamos de forma consciente datos de menores; si detectamos un registro de un menor, eliminaremos sus datos.

## Cambios en esta política

Podemos actualizar esta política ante cambios legales o del servicio. Te avisaremos de cualquier cambio sustancial por la app o por email, y si afecta a un tratamiento basado en consentimiento, te pediremos ese consentimiento de nuevo cuando la ley lo exija.

## Contacto

BeStronger — contacto@bestronger.es — bestronger.es
