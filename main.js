console.log("hi");

const str = JSON.stringify;
const pp = (x) => console.log(str(x));
const compose = (f, g) => (x) => f(g(x));
const af = Array.from;
const afs = (x) => JSON.stringify(Array.from(x));

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const rootContainer = "#app";

function scrollBody() {
  window.scrollTo(0, document.body.scrollHeight);
}

function addDoc(x) {
  document.querySelector(rootContainer).innerHTML += `<p>${x}</p>`;
  scrollBody();
}

// display test results on page
function test(fn, ...args) {
  let val = fn(...args);
  let result = val;
  if (Array.isArray(result)) {
    result = result.map((r) => `<li>${str(r)}</li>`).join("");
  } else if (result === undefined) {
    result = "✅";
  } else {
    result = str(result);
  }
  addDoc(`${fn.name}(${args.map((a) => JSON.stringify(a)).join(", ")}): <ul>${result}</li>`);
  return val;
}

function emptyDb() {
  return new Map();
}
let world = emptyDb();

function ppWorld(world) {
  result = "";
  for (let [key, val] of world) {
    result += `<p>${key}: `;
    result += JSON.stringify(val);
    result += "</p>";
  }
  return result;
}

function redraw() {
  document.querySelector(rootContainer).innerHTML += ` ${ppWorld(world)} `;
  scrollBody();
}

/* variables */
function selectRel(db, tag) {
  let v = db.get(tag);
  if (v === undefined) {
    v = new Map();
    db.set(tag, v);
  }
  return v;
}
function key(tuple) {
  return JSON.stringify(tuple);
}
function getKey(rel, key) {
  let v = rel.get(key);
  return v === undefined ? 0 : v[1];
}
function relAddTupleWithKey(rel, k, tuple, count = 1) {
  let v = getKey(rel, k) + count;
  if (v !== 0) rel.set(k, [tuple, v]);
  else rel.delete(k);
}
function relAddTuple(rel, tuple, count = 1) {
  let k = key(tuple);
  return relAddTupleWithKey(rel, k, tuple, count);
}
function dbAddTuple(db, tag, tuple, count = 1) {
  relAddTuple(selectRel(db, tag), tuple, count);
}
function relAddRel(rel1, rel2) {
  // mutates left arg
  for (let [k, v] of rel2.entries()) {
    relAddTupleWithKey(rel1, k, v[0], v[1]);
  }
}
function dbAddDb(db1, db2) {
  // mutates left arg
  for (let [tag, rel] of db2.entries()) {
    relAddRel(selectRel(db1, tag), rel);
  }
}
const yield = dbAddTuple;
const remove = (db, tag, tuple) => dbAddTuple(db, tag, tuple, -1);

function iterRel(db, tag) {
  return selectRel(db, tag).values();
}
function printDb(db) {
  console.log(
    af(db.entries()).map(([tag, rel]) => [tag, af(rel.entries()).map(([key, [_, c]]) => [key, c])])
  );
}
/* end variables */

yield(world, "edge", [0, 1]);
yield(world, "edge", [1, 2]);
yield(world, "edge", [2, 3]);

function joinTuple(t_, s_) {
  let [t, tv] = t_;
  t = structuredClone(t);
  let [s, sv] = s_;
  // in!
  for (let key in s) {
    if (key in t) {
      if (t[key] != s[key]) return false;
    } else t[key] = s[key];
  }
  return [t, tv * sv];
}

function* join(a, b) {
  for (let t1 of a) {
    for (let t2 of b) {
      let t = joinTuple(t1, t2);
      if (t != false) yield t;
    }
  }
}

// todo: only works on numerically indexed tuples
function rename(tuple, names) {
  let result = {};
  let i = 0;
  for (let name of names) {
    if (name[0] === "`" || name[0] === "'") {
      if (tuple[i] !== name.slice(1)) return false;
    } else {
      if ((name in result && result[name] !== tuple[i]) || !(i in tuple)) return false;
      result[name] = tuple[i];
    }
    i++;
  }
  return result;
}

function* selectPattern(db, p) {
  for (let t_ of iterRel(db, p[0])) {
    t = rename(t_[0], p[1]);
    if (t !== false) yield [t, t_[1]];
  }
}

const joins = (db, ps) => ps.map((p) => selectPattern(db, p)).reduce(join, [[{}, 1]]);
const joinsCollect = (db, ps) => Array.from(joins(db, ps));

test(joinsCollect, world, [
  ["edge", [0, 1]],
  ["edge", [1, 2]],
]);

test(joinsCollect, world, [
  ["edge", ["a", "b"]],
  ["edge", ["b", "c"]],
  ["edge", ["c", "d"]],
  ["edge", ["d", "e"]],
]);

function parseQuery(str) {
  // 'f a b, g b c'
  return str.split(",").map((w) => {
    // ['f', 'a', 'b']
    let lst = w
      .trim()
      .split(" ")
      .filter((w) => w.length > 0);
    // ['f', ['a', 'b']]
    return [lst[0], lst.slice(1)];
  });
}

const ppQuery = (ps) => {
  return ps.map(([tag, vs]) => [tag].concat(vs).join(" ")).join(", ");
};

// eta-expanded so that it has a `.name`
const pp_parse = (x) => ppQuery(parseQuery(x));

const eval = (db, str) => Array.from(joins(db, parseQuery(str)));

test(pp_parse, "edge a b, edge b c");
test(eval, world, "edge a b, edge b c");

function unrename(tuple, names) {
  return names.reduce((acc, name) => {
    if (name[0] === "`" || name[0] === "'") {
      return acc.concat(name.slice(1));
    } else {
      return acc.concat([tuple[name]]);
    }
  }, []);
}

function evalRule(db, { query, output }) {
  let bindings = joins(db, query);
  for (let tuple of bindings) {
    for (let pattern of output) {
      yield(world, pattern[0], unrename(tuple, pattern[1]));
    }
  }
}

function parseRule(str) {
  let [query, output] = str.split("->").map(parseQuery);
  return { query, output };
}

test(evalRule, world, parseRule("edge a b, edge b c -> edge2 a c"));
test(eval, world, "edge2 x y");

function getId(id) {
  return document.getElementById(id);
}
function create(type) {
  let e = document.createElement(type);
  childParent(e, getId("body"));
  return e;
}
function childParent(child, parent) {
  assert(child !== null, `${child}, ${parent}`);
  let maybeParent = child.parentNode;
  if (maybeParent) maybeParent.removeChild(child);
  parent.appendChild(child);
  return child;
}
function createChildElem(type, parent) {
  return childParent(create(type), parent);
}
function createChildId(type, id) {
  return createChildElem(type, getId(id));
}
function yieldElement(tag, id) {
  let e = create(tag);
  e.id = id;
  return e;
}

yield(world, "foo", ["a", "b"]);
yield(world, "foo", ["A", "B"]);
test(eval, world, "foo `A x");
test(evalRule, world, parseRule("foo `a y -> bar `foo-bar y"));
test(eval, world, "bar x y");

// assert
try {
  assert(false, "expected error");
  alert("assert should have failed!");
} catch (e) {}

function specialRelationHandler(tag, args) {
  let msg = (name, expected) =>
    `special relation '${name}' takes (${expected.join(",")}) but saw: (${args})`;
  if (tag === "create") {
    assert(args.length === 2, msg("create", ["element-type", "id"]));
    yieldElement(args[0], args[1]);
  } else if (tag === "style") {
    assert(args.length === 3, msg("style", ["id", "css-prop", "value"]));
    getId(args[0]).style[args[1]] = args[2];
  } else if (tag === "parent") {
    assert(args.length === 2, msg("parent", ["id", "id"]));
    childParent(getId(args[0]), getId(args[1]));
  } else if (tag === "inner") {
    assert(args.length === 2, msg("inner", ["id", "content"]));
    getId(args[0]).innerHTML = args[1];
  }
}

function evalRule2(db, { query, output }) {
  let bindings = joins(db, query);
  for (let [tuple, _] of bindings) {
    for (let pattern of output) {
      let tag = pattern[0];
      let args = unrename(tuple, pattern[1]);
      specialRelationHandler(tag, args);
      // always do this
      yield(world, tag, args);
    }
  }
}

test(
  evalRule2,
  world,
  parseRule(`
edge a b ->
  create 'button a,
  parent a 'app,
  inner a a,
  style a 'background '#dda
`)
);

function collect(i, acc) {
  for (let v of i) acc.push(v);
}

// delta query without specialization
function* delta(ps, x, a) {
  if (ps.length === 0) return [];
  let R = ps[0];
  let S = ps.slice(1);
  let Rx = selectPattern(x, R);
  let Ra = af(selectPattern(a, R));
  let Sx = joins(x, S);
  let Sa = af(delta(S, x, a));
  for (let t of join(Ra, Sx)) yield t;
  for (let t of join(Rx, Sa)) yield t;
  for (let t of join(Ra, Sa)) yield t;
}
const deltaCollect = (ps, x, a) => af(delta(ps, x, a));

let x = emptyDb();
yield(x, "R", ["old"]);
yield(x, "S", ["old"]);
let a = emptyDb();
yield(a, "R", ["new"]);
yield(a, "S", ["new"]);
let b = emptyDb();
remove(b, "R", ["old"]);
remove(b, "S", ["old"]);

const pq = parseQuery;

test(deltaCollect, pq("R x, S y"), x, a);
test(deltaCollect, pq("R x, S y"), x, b);

// something to note later: https://groups.google.com/g/v8-users/c/jlISWv1nXWU/m/LOLtbuovAgAJ

// handle deletion (along with elements)
function evalDelta(db, ddb, { query, output }) {
  let bindings = delta(query, db, ddb);
  let result = emptyDb();
  for (let [tuple, weight] of bindings) {
    for (let pattern of output) {
      let tag = pattern[0];
      let args = unrename(tuple, pattern[1]);
      specialRelationHandler(tag, args);
      yield(result, tag, args, weight);
    }
  }
  dbAddDb(db, ddb);
  dbAddDb(db, result);
}

{
  let db = emptyDb();
  let query = pq("R x, S y");
  let output = pq("T x y");
  test(eval, db, "T x y");
  evalDelta(db, x, { query, output });
  test(eval, db, "T x y");
  evalDelta(db, b, { query, output });
  test(eval, db, "T x y");
}
