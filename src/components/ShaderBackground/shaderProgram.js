const VERTEX_SHADER_SRC = `
  attribute vec2 p;
  void main() {
    gl_Position = vec4(p, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision mediump float;
  uniform vec2 resolution;
  uniform float time;
  uniform vec3 palette;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float blob(vec2 p, vec2 c, float r) {
    return smoothstep(r, r - 0.22, length(p - c));
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec2 p = (uv - 0.5) * vec2(resolution.x / resolution.y, 1.0);
    float t = time * 0.075;

    float n = noise(p * 2.2 + vec2(t, -t * 0.7));
    vec2 c1 = vec2(0.26 * sin(t * 1.4), 0.12 * cos(t));
    vec2 c2 = vec2(-0.24 * cos(t * 0.8), -0.14 * sin(t * 1.1));

    float field = blob(p, c1, 0.48) + blob(p, c2, 0.42) + blob(p, vec2(0.15 * sin(t), 0.2 * cos(t * 0.8)), 0.3);
    field *= 0.24 + 0.16 * n;

    vec3 col = palette * field;
    col += vec3(0.12, 0.09, 0.07) * smoothstep(0.8, 0.05, length(p)) * (0.28 + n * 0.12);

    float vignette = smoothstep(1.15, 0.22, length(p));
    gl_FragColor = vec4(col * vignette, field * 0.55 * vignette);
  }
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function createShaderProgram(gl) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
  if (!vertexShader || !fragmentShader) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Shader link error:', gl.getProgramInfoLog(program));
    return null;
  }

  gl.useProgram(program);

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  );

  const loc = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  return {
    program,
    timeLoc: gl.getUniformLocation(program, 'time'),
    resLoc: gl.getUniformLocation(program, 'resolution'),
    paletteLoc: gl.getUniformLocation(program, 'palette')
  };
}

export function resizeShaderCanvas(gl, canvas) {
  if (!gl || !canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth * dpr;
  const height = window.innerHeight * dpr;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
  }
}
