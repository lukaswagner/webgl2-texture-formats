// acquire context
const canvas = document.createElement('canvas');
const gl = canvas.getContext('webgl2');

// create output table
const output = document.createElement('table');
document.body.appendChild(output);
document.body.style.fontFamily = 'monospace';

// add table header
{
    const row = output.insertRow();
    row.insertCell();
    row.insertCell().innerText = '#ch';
    row.insertCell().innerText = 'type';
    row.insertCell().innerText = 'bits';
    row.insertCell().innerText = 'sized format';
    row.insertCell().innerText = 'base format';
    row.insertCell().innerText = 'type';
}

// type defs
type Format = [GLuint, GLuint, GLuint];
enum Type { FLOAT = 0, SIGNED = 1, UNSIGNED = 2 };
type FormatSpec = { channels: number, type: Type, depth: number };
type GlFormat = { internal: number, format: number, type: number };
type FullFormat = { spec: FormatSpec, gl: GlFormat };
type Result = { valid: boolean, error: string };

// ensure float buf availability
gl.getExtension('EXT_color_buffer_float');

// helper functions
const internalSuffix = (spec: FormatSpec): string => {
    switch (spec.type) {
        case Type.FLOAT: return spec.depth > 8 ? 'F' : '';
        case Type.SIGNED: return 'I';
        case Type.UNSIGNED: return 'UI';
    }
}

const formatSuffix = (spec: FormatSpec): string => {
    return spec.type === Type.FLOAT ? '' : '_INTEGER';
}

const storeType = (spec: FormatSpec): string => {
    let result = '';
    const size = spec.depth / 8 - 1;
    switch (spec.type) {
        case Type.FLOAT:
            result += ['UNSIGNED_BYTE', 'HALF_FLOAT', '', 'FLOAT'][size];
            break;
        case Type.UNSIGNED: 
            result += 'UNSIGNED_';
        case Type.SIGNED:
            result += ['BYTE', 'SHORT', '', 'INT'][size];
    }
    return result;
}

// generates WebGL enums
const generate = (spec: FormatSpec): FullFormat => {
    const rgba = 'RGBA'.substring(0, spec.channels);
    const i = rgba + spec.depth + internalSuffix(spec);
    const f = (spec.channels === 1 ? 'RED' : rgba) + formatSuffix(spec);
    const t = storeType(spec);
    // @ts-ignore
    return { spec, gl: { internal: gl[i], format: gl[f], type: gl[t] } };
}

// specify tested configurations
const channels = [1, 2, 3, 4];
const types = [Type.FLOAT, Type.SIGNED, Type.UNSIGNED];
const depths = [8, 16, 32];

// generate tested configurations
const formats: FullFormat[] = [];
types.forEach((type) =>
    depths.forEach((depth) =>
        channels.forEach((channels) =>
            formats.push(generate({channels, type, depth})))));

// generate reverse lookup for WebGL enums
const lookup = new Map<GLuint, string>();
for(const i in WebGL2RenderingContext) {
    // @ts-ignore
    const v = WebGL2RenderingContext[i];
    if (typeof v === 'number') lookup.set(v, i);
}

// try creating a texture and binding as color attachment
const check = (f: GlFormat): Result => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, f.internal, 1, 1, 0, f.format, f.type, undefined);

    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);

    const state = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    const valid = state === gl.FRAMEBUFFER_COMPLETE;
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, undefined);
    gl.deleteFramebuffer(fb);
    gl.bindTexture(gl.TEXTURE_2D, undefined);
    gl.deleteTexture(tex);

    return { valid, error: lookup.get(state) };
}

// add results to output table
const log = (f: FullFormat, result: Result): void => {
    const row = output.insertRow();
    row.insertCell().innerText = result.valid ? '🟢' : '🔴';
    row.insertCell().innerText = f.spec.channels.toString();
    row.insertCell().innerText = Type[f.spec.type];
    row.insertCell().innerText = f.spec.depth.toString();
    row.insertCell().innerText = lookup.get(f.gl.internal);
    row.insertCell().innerText = lookup.get(f.gl.format);
    row.insertCell().innerText = lookup.get(f.gl.type);
    if(!result.valid)
        row.insertCell().innerText = result.error;
}

// check and output all configurations
for(let format of formats) {
    const valid = check(format.gl);
    log(format, valid);
}
