//document.querySelector('#app').innerHTML = ` `
console.log('hi');

const str = JSON.stringify;
const pp = (x) => console.log(str(x))
const compose = (f, g) => (x) => f(g(x))

const rootContainer = '#app'

function addDoc(x) {
  document.querySelector(rootContainer).innerHTML += `<p>${x}</p>`;
}
function ppDoc(x) {
  document.querySelector(rootContainer).innerHTML += `<p>${str(x)}</p>`
}


let world = {}

function get(tag) {
  let v = world[tag]
  if (v === undefined) {
    v = []
    world[tag] = v
  }
  return v
}

function yield(tag, tuple) {
  get(tag).push(tuple);
  // redraw();
}

function redraw() {
  document.querySelector(rootContainer).innerHTML = ` ${ppWorld(world)} `
}

function ppWorld(world) {
  result = ""
  for (let key in world) {
    result += `<p>${key}: `;
    result += JSON.stringify(world[key])
    result += '</p>';
  }
  return result;
}


yield('edge', [0,1]);
yield('edge', [1,2]);
yield('edge', [2,3]);
//yield('vert', [0]);
//yield('vert', [1]);
//yield('vert', [2]);

function joinTuple(t,s) {
  t = structuredClone(t);
  // in!
  for (let key in s) {
    if (key in t) {
      if (t[key] != s[key])
        return false
    } else
      t[key] = s[key];
  }
  return t;
}

function join(a,b) {
  let result = [];
  for (let t1 of a) {
    for (let t2 of b) {
      let t = joinTuple(t1, t2);
      if (t != false) {
        result.push(t);
      }
    }
  }
  return result;
}

// todo: only works on numerically indexed tuples
function rename(tuple, names) {
  let result = {};
  let i = 0;
  for (let name of names) {
    if ((name in result && result[name] !== tuple[i]) || !(i in tuple))
      return false
    result[name] = tuple[i];
    i++;
  }
  return result;
}

function chk(p1,p2) {
  let r1 = get(p1[0]);
  let r2 = get(p2[0]);
  return join(
    r1.map(t => rename(t, p1[1])),
    r2.map(t => rename(t, p2[1]))
  );
}

const relOfPat = p => get(p[0]).map(t => rename(t, p[1])).filter(t => t !== false);
const joins = ps => ps.map(relOfPat).reduce(join, [{}]);
// ['edge', ['x, 'y']] ->

/*

 edge =
   src | tgt
   ---------
   0   , 1
   1   , 2
   2   , 3
   3   , 4

 people =
   name | id | favorite cat
   ---------------------
   scott | 22 | ???


 SELECT src as a, tgt as b
 FROM edge
 -> a=0, b=1 ; a=1, b=2; ...

 SELECT E1.src as a, E1.tgt as b, E2.tgt as c
 FROM edge as E1, edge as E2
 WHERE E1.tgt = E2.src

 -> (a=0, b=1, c=2) (a=1, b=2, c=3)

 edge(a, b), edge(c, d)
 edge(a, b), edge(c, d), edge(e, f), edge(g, h)

 edge(a, b), edge(b, c)

 edge(foo, b)
 edge(a, 1)
 edge(0, 2)

 */

function test1() {
  [
    joins([
    ['edge', [0,1]],
    ['edge', [1,2]]
  ]),
    joins([
    ['edge', ['a','b']],
    ['edge', ['b','c']],
    ['edge', ['c','d']],
    ['edge', ['d','e']],
  ])
  ].map(pp);
}

test1();

function parseQuery(str) {
  // 'f a b, g b c'
  return str.split(',')
    .map(w => {
      // ['f', 'a', 'b']
      let lst = w.trim().split(' ').filter(w => w.length > 0);
      // ['f', ['a', 'b']]
      return [lst[0], lst.slice(1)]
    });
}

const ppQuery = (ps) => {
  return ps.map(([tag, vs]) => [tag].concat(vs).join(' ')) .join(', ');
}

const pp_parse = (x) => compose(ppQuery, parseQuery)(x);

const eval = (str) => joins(parseQuery(str));

function test(fn, ...args) {
  let result = fn(...args);
  if (Array.isArray(result)) {
    result = result.map(r => `<li>${str(r)}</li>`).join('');
  } else {
    result = str(result);
  }
  addDoc(`${fn.name}(${args.map(a => JSON.stringify(a)).join(', ')}): <ul>${result}</li>`);
}

test(pp_parse, 'edge a b, edge b c');
test(eval, 'edge a b, edge b c');

function unrename(tuple, names) { return names.reduce((acc, name) => acc.concat([tuple[name]]), []); }

function evalRule({query, output}) {
  let bindings = eval(query);
  for (let tuple of bindings) {
    for (let pattern of parseQuery(output)) {
      yield(pattern[0], unrename(tuple, pattern[1]))
    }
  }
}

const r1 = {
  query: 'edge a b, edge b c',
  output: 'edge2 a c'
}

test(evalRule, r1);
test(eval, 'edge2 x y');


// integration with dom
// step 0 (re-evaluate query from scratch): clear out IDB
// step 1: clear the whole dom and reconstruct on every change

// text-val f -> text-field f
// text-val f -> text-field ('tf', f)
// text-field f, value f v -> content f v

// literal values in queries (number, string)
// builtin functions

// refactor away from world


// ? input idea `!select x`
