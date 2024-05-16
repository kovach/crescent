document.querySelector('#app').innerHTML = `
<p>hi</p>
<p>this is a website</p>
`
console.log('hi');

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
  redraw();
}

function redraw() {
  document.querySelector('#app').innerHTML = ` ${pp(world)} `
}

function pp(world) {
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
    if (name in result && result[name] !== tuple[i])
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

const relOfPat = p => get(p[0]).map(t => rename(t, p[1]));
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
  ].map(t => console.log(JSON.stringify(t)));
}

test1();

function parseQuery(str) {
  return str.split(',')
    .map(w => w.trim().split(' '))
    .map(lst => [lst[0], lst.slice(1)])
}


// print query and query result
//   log everything
