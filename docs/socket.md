# Servidor de Socket (WebSocket) baseado no socket.io

REF: https://socket.io/docs/v4/server-socket-instance/


Node framework adota o Socket.io para comunicação via websocket. Toda configuração é inicialização do servidor socket é abstraida pelo framework.
Basta definir a configuração na seção socket

Você pode implementar sua aplicação socket diretamente no controller com alguns métodos auxiliares.

Para ter acesso ao objeto io do socket.io utilize this.io

Exemplo:

```javascript

export default class HelloWorldController extends Controller {
  socket () {
    this.namespace('/jobs').on('connection', socket => {
      socket.emit('newData', { nane: 'André' })
    })
  }
}

```
Você também pode chamar this.io e pode chamar de qualquer parte do controller, mas é boa prática centralizar configuração socket no método socket


## Eventos

Ref: https://socket.io/docs/v4/emitting-events/

[CheatSheet](https://socket.io/docs/v4/emit-cheatsheet/)


A API Socket.IO é inspirada no Node.js EventEmitter, o que significa que você pode emitir eventos de um lado e registrar ouvintes do outro:

```javascript

// Server site
this.io('connection', socket => {
    socket.emit("hello", 1, "2", {3: '4', 5: Buffer.from([6])})
})

// Client side:
socket.on("hello", (arg1, arg2, arg3) => {
  console.log(arg1); // 1
  console.log(arg2); // "2"
  console.log(arg3); // { 3: '4', 5: ArrayBuffer (1) [ 6 ] }
});

```

Onde o primeiro argumento é o nome do evento e os demais são atributos para ser enviado


**DICA:** Não há necessidade de executar JSON.stringify() em objetos, pois isso será feito para você.


## Rooms

Uma sala é um canal arbitrário no qual os soquetes podem entrar e sair. 
Ele pode ser usado para transmitir eventos para um subconjunto de clientes.

https://socket.io/docs/v4/rooms/

**NOTA:** Observe que as salas são um conceito apenas de servidor (ou seja, o cliente não tem acesso à lista de salas às quais ingressou).

Exemplos:
```javascript

// Adiciona um socket (Socket representa o cliente ou a conexão do cliente):
this.io.on("connection", (socket) => {
  socket.join("MinhaSala")
});

// Enviar mensagem para toda sala:
this.io.to("some room").emit("some event")

// Enviar mensagem para várias as salas:
this.io.to("room1").to("room2").to("room3").emit("some event")

// Enviar broadcast à partir da instancia socket:
this.io.on("connection", (socket) => {
  socket.to("some room").emit("some event");
});

```

**Notas:**
* Se o socket estiver em mais de uma sala, e for enviado mensagem para várias salas, socket só recebe mensagem 1 vez


## Namespace

Implementação no node framework é focado em namespace:

REf: https://socket.io/docs/v4/namespaces/

Possiveis casos de uso:

* Você deseja criar um namespace especial ao qual apenas usuários autorizados tenham acesso, para que a lógica
  relacionada a esses usuários seja separada do restante do aplicativo

Ex:
```javascript

this.namespace('/admin').use((socket, next) => {
  // ensure the user has sufficient rights
  next();
});

this.namespace('/admin', socket => {
  socket.on('delete user', () => {
    // ...
  });
});

```

* Seu aplicativo tem vários inquilinos, portanto, você deseja criar dinamicamente um namespace por inquilino

Ex:
```javascript

this.namespace(/^\/\w+$/).on('connection', socket => {
    const workspace = socket.nsp;

    workspace.emit('hello');
});
```


### Emitir um evento

Em qualquer lugar no controller você pode chamar:

```javascript
    this.namespace('/my-namespace').emit('hi', 'everyone!')

 ```

Onde o primeiro argumento é o nome do evento e os demais são atributos para ser enviado

### No cliente:

Para inicializar um namespace no cliente utilizar o caminho completo:

```javascript
  const socket = io("https://example.com"); // or io("https://example.com/"), the main namespace
  const orderSocket = io("https://example.com/orders"); // the "orders" namespace
  const userSocket = io("https://example.com/users"); // the "users" namespace
```

O restante é similar