/**
 * Passagem, de proposito.
 *
 * O LoginValora traz a propria moldura de tela cheia. Se esta camada
 * continuasse desenhando blobs, logo e vidro, o cartao do login apareceria
 * dentro de outro cartao — foi exatamente o que aconteceu no Rustic quando a
 * troca foi feita sem mexer aqui.
 *
 * A moldura antiga nao sumiu: desceu para a pagina de cadastro, que ainda a
 * usa. Ver app/(auth)/cadastro/moldura.tsx.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
