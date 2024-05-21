//document.querySelector('#app').innerHTML = ` `
console.log("hi");

const str = JSON.stringify;
const pp = (x) => console.log(str(x));
const compose = (f, g) => (x) => f(g(x));

const rootContainer = "#app";

function addDoc(x) {
  document.querySelector(rootContainer).innerHTML += `<p>${x}</p>`;
}
function ppDoc(x) {
  document.querySelector(rootContainer).innerHTML += `<p>${str(x)}</p>`;
}

let world = {};

function get(tag) {
  let v = world[tag];
  if (v === undefined) {
    v = [];
    world[tag] = v;
  }
  return v;
}

function yield(tag, tuple) {
  get(tag).push(tuple);
  // redraw();
}

function redraw() {
  document.querySelector(rootContainer).innerHTML = ` ${ppWorld(world)} `;
}

function ppWorld(world) {
  result = "";
  for (let key in world) {
    result += `<p>${key}: `;
    result += JSON.stringify(world[key]);
    result += "</p>";
  }
  return result;
}

yield("edge", [0, 1]);
yield("edge", [1, 2]);
yield("edge", [2, 3]);
//yield('vert', [0]);
//yield('vert', [1]);
//yield('vert', [2]);

function joinTuple(t, s) {
  t = structuredClone(t);
  // in!
  for (let key in s) {
    if (key in t) {
      if (t[key] != s[key]) return false;
    } else t[key] = s[key];
  }
  return t;
}

function join(a, b) {
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
    if (name[0] === "`" || name[0] === "'") {
      if (tuple[i] !== name.slice(1)) return false;
    } else {
      if ((name in result && result[name] !== tuple[i]) || !(i in tuple))
        return false;
      result[name] = tuple[i];
    }
    i++;
  }
  return result;
}

const relOfPat = (p) =>
  get(p[0])
    .map((t) => rename(t, p[1]))
    .filter((t) => t !== false);
const joins = (ps) => ps.map(relOfPat).reduce(join, [{}]);

function test1() {
  [
    joins([
      ["edge", [0, 1]],
      ["edge", [1, 2]],
    ]),
    joins([
      ["edge", ["a", "b"]],
      ["edge", ["b", "c"]],
      ["edge", ["c", "d"]],
      ["edge", ["d", "e"]],
    ]),
  ].map(pp);
}

test1();

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

const pp_parse = (x) => compose(ppQuery, parseQuery)(x);

const eval = (str) => joins(parseQuery(str));

function test(fn, ...args) {
  let result = fn(...args);
  if (Array.isArray(result)) {
    result = result.map((r) => `<li>${str(r)}</li>`).join("");
  } else if (result === undefined) {
    result = "✅";
  } else {
    result = str(result);
  }
  addDoc(
    `${fn.name}(${args
      .map((a) => JSON.stringify(a))
      .join(", ")}): <ul>${result}</li>`
  );
}

test(pp_parse, "edge a b, edge b c");
test(eval, "edge a b, edge b c");

function unrename(tuple, names) {
  return names.reduce((acc, name) => {
    if (name[0] === "`" || name[0] === "'") {
      return acc.concat(name.slice(1));
    } else {
      return acc.concat([tuple[name]]);
    }
  }, []);
}

function evalRule({ query, output }) {
  let bindings = joins(query);
  for (let tuple of bindings) {
    for (let pattern of output) {
      yield(pattern[0], unrename(tuple, pattern[1]));
    }
  }
}

function parseRule(str) {
  let [query, output] = str.split("->").map(parseQuery);
  return { query, output };
}

test(evalRule, parseRule("edge a b, edge b c -> edge2 a c"));
test(eval, "edge2 x y");

function getId(id) {
  return document.getElementById(id);
}
function create(type) {
  let e = document.createElement(type);
  childParent(e, getId("body"));
  return e;
}
function childParent(child, parent) {
  console.log(child);
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

yield("foo", ["a", "b"]);
yield("foo", ["A", "B"]);
test(eval, "foo `A x");
test(evalRule, parseRule("foo `a y -> bar `foo-bar y"));
test(eval, "bar x y");

function assert(cond, msg) {
  if (!cond) {
    alert(msg);
  }
}

function specialRelationHandler(tag, args) {
  if (tag === "create") {
    assert(
      args.length === 2,
      `special relation 'create' takes element type, id: ${args}`
    );
    yieldElement(args[0], args[1]);
  } else if (tag === "style") {
    assert(
      args.length === 3,
      `special relation 'style' takes element id, attribute name, value: ${args}`
    );
    //getId(args[0]).setAttribute(args[1], args[2]);
    getId(args[0]).style[args[1]] = args[2];
  } else if (tag === "parent") {
    assert(
      args.length === 2,
      `special relation 'parent' takes child id, parent id: ${args}`
    );
    childParent(getId(args[0]), getId(args[1]));
  } else if (tag === "inner") {
    assert(
      args.length === 2,
      `special relation 'inner' takes element id, value: ${args}`
    );
    getId(args[0]).innerHTML = args[1];
  }
}

function evalRule2({ query, output }) {
  let bindings = joins(query);
  for (let tuple of bindings) {
    for (let pattern of output) {
      let tag = pattern[0];
      let args = unrename(tuple, pattern[1]);
      specialRelationHandler(tag, args);
      // always do this
      yield(tag, args);
    }
  }
}

let color = 0;
test(
  evalRule2,
  parseRule(`
edge a b ->
create 'button a, parent a 'app, inner a a
, style a 'background '#dda
`)
);
