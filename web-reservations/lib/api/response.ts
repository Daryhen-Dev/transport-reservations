import { NextResponse } from "next/server";

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function created<T>(data: T) {
  return NextResponse.json({ data }, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function badRequest(error: string, details?: Record<string, string[]>) {
  return NextResponse.json({ error, details }, { status: 400 });
}

export function unauthorized(error = "No autorizado") {
  return NextResponse.json({ error }, { status: 401 });
}

export function forbidden(error = "Acceso denegado") {
  return NextResponse.json({ error }, { status: 403 });
}

export function notFound(error = "No encontrado") {
  return NextResponse.json({ error }, { status: 404 });
}

export function conflict(error: string) {
  return NextResponse.json({ error }, { status: 409 });
}

export function serverError(error = "Error interno del servidor") {
  return NextResponse.json({ error }, { status: 500 });
}
