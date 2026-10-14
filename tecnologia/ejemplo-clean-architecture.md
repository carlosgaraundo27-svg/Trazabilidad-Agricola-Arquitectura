# Ejemplo didáctico de Clean Architecture

Este directorio contiene un ejemplo pequeño y conceptual para mostrar la dirección de dependencias. No es el backend productivo y no incluye conexión real a PostgreSQL o Redis.

## 1. Dominio

~~~typescript
export type EstadoLote = "PENDIENTE" | "EN_PROCESO" | "CERRADO";

export interface EventoTrazabilidad {
  id: string;
  loteId: string;
  tipo: string;
  fechaHora: Date;
  actorId: string;
  descripcion: string;
}

export class Lote {
  constructor(
    public readonly id: string,
    public readonly codigo: string,
    private estado: EstadoLote,
    private eventos: EventoTrazabilidad[] = [],
  ) {}

  registrarEvento(evento: EventoTrazabilidad): void {
    if (evento.loteId !== this.id) {
      throw new Error("El evento debe pertenecer al lote.");
    }
    this.eventos.push(evento);
  }

  obtenerEstado(): EstadoLote {
    return this.estado;
  }

  obtenerEventos(): readonly EventoTrazabilidad[] {
    return [...this.eventos];
  }
}
~~~

Este ejemplo valida que el evento pertenezca al lote. La regla definitiva sobre si un lote cerrado admite nuevos eventos debe definirse con el negocio; el requisito vigente protege expresamente la modificación ordinaria de eventos ya cerrados.

## 2. Puerto del repositorio

~~~typescript
import { Lote } from "./Lote";

export interface TrazabilidadRepository {
  obtenerPorCodigo(codigo: string): Promise<Lote | null>;
  guardar(lote: Lote): Promise<void>;
}
~~~

## 3. Caso de uso de aplicación

~~~typescript
import { TrazabilidadRepository } from "../domain/TrazabilidadRepository";

export interface TrazabilidadPublicaDTO {
  codigoLote: string;
  estado: string;
  eventos: Array<{ tipo: string; fechaHora: string; descripcion: string }>;
}

export class ConsultarTrazabilidadPublica {
  constructor(private readonly repository: TrazabilidadRepository) {}

  async ejecutar(codigo: string): Promise<TrazabilidadPublicaDTO> {
    if (!codigo.trim()) {
      throw new Error("El código QR es obligatorio.");
    }
    const lote = await this.repository.obtenerPorCodigo(codigo);
    if (!lote) {
      throw new Error("Lote no encontrado.");
    }

    // Se devuelve una proyección limitada: nunca se expone el agregado completo.
    return {
      codigoLote: lote.codigo,
      estado: lote.obtenerEstado(),
      eventos: lote.obtenerEventos().map((evento) => ({
        tipo: evento.tipo,
        fechaHora: evento.fechaHora.toISOString(),
        descripcion: evento.descripcion,
      })),
    };
  }
}
~~~

## 4. Adaptador de infraestructura

Una implementación real, por ejemplo PostgresTrazabilidadRepository, implementaría la interfaz TrazabilidadRepository y traduciría las operaciones a consultas de base de datos. El caso de uso no necesita conocer SQL, ORM o librerías de conexión.

## Qué demuestra el ejemplo

- El dominio contiene una regla y no depende de frameworks.
- El caso de uso depende de una interfaz.
- El adaptador de persistencia implementa esa interfaz desde afuera.
- La respuesta pública es un DTO limitado, lo que ayuda a proteger información interna.
- El ejemplo no sustituye las reglas de negocio que el equipo debe definir ni constituye todavía una implementación validada.
