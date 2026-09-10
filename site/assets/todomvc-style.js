export default `/* TodoMVC's familiar paper-and-pencil layout, adapted to this self-contained lesson. */
body { background:#f5f5f5; color:#4d4d4d; font:14px 'Helvetica Neue',Helvetica,Arial,sans-serif; font-weight:300; }
#app { padding:24px 28px; }
.lesson>.hero { display:none; }
.lesson>.lede { margin-top:34px; font-size:13px; }
.lesson .story { font-size:13px; }
.lesson { display:flex; flex-direction:column; }
#experiment { margin:0; order:-1; }
.todoapp { position:relative; margin:105px 0 40px; padding:0; background:white; border-radius:0; box-shadow:0 2px 4px #0003,0 25px 50px #0000001a; }
.todos-heading { position:absolute; top:-105px; width:100%; margin:0; color:#b83f45; text-align:center; font:200 80px/1 'Helvetica Neue',Helvetica,Arial,sans-serif; letter-spacing:0; }
#new-todo { width:100%; margin:0; padding:16px 16px 16px 60px; border:0; border-radius:0; color:#4d4d4d; font:italic 24px/1.4 'Helvetica Neue',Helvetica,Arial,sans-serif; background:#00000001; box-shadow:inset 0 -2px 1px #00000008; }
#new-todo::placeholder { color:#949494; opacity:1; }
#new-todo:focus-visible { outline:2px solid #b83f45; outline-offset:-2px; }
.todo-main { border-top:1px solid #e6e6e6; }
#toggle-all { position:absolute; top:9px; left:7px; width:46px; height:46px; opacity:0; margin:0; z-index:2; cursor:pointer; }
.toggle-all-label { position:absolute; top:18px; left:18px; color:#949494; font-size:23px; transform:rotate(90deg); line-height:1; }
#toggle-all:checked+.toggle-all-label { color:#4d4d4d; }
#toggle-all:focus-visible+.toggle-all-label { outline:2px solid #b83f45; outline-offset:8px; }
.list ul { list-style:none; margin:0; padding:0; }
.list .todo-item { display:flex; align-items:center; gap:0; position:relative; min-height:59px; padding:0; border:0; border-bottom:1px solid #ededed; border-radius:0; background:white; font-size:24px; }
.todo-item input.toggle { appearance:none; display:grid; place-items:center; width:30px; height:30px; padding:0; margin:0 15px; flex-shrink:0; border:1px solid #949494; border-radius:50%; background:white; cursor:pointer; }
.todo-item input.toggle:checked { border-color:#5dc2af; }
.todo-item input.toggle:checked::after { content:''; display:block; width:8px; height:14px; border:solid #3d9986; border-width:0 2px 2px 0; transform:translateY(-2px) rotate(45deg); }
.todo-title { flex:1; min-width:0; margin:0; padding:15px 40px 15px 0; font:300 24px/1.2 'Helvetica Neue',Helvetica,Arial,sans-serif; overflow-wrap:anywhere; }
.completed .todo-title { text-decoration:line-through; color:#949494; }
.todo-item .delete-todo { display:none; position:absolute; right:10px; margin:0; padding:0; width:30px; height:40px; border:0; background:none; color:#949494; font:30px/1 Arial,sans-serif; }
.todo-item:hover .delete-todo,.todo-item:focus-within .delete-todo { display:block; }
.todo-item .delete-todo:hover { color:#b83f45; }
.todo-item .edit { margin:0 0 0 43px; width:calc(100% - 43px); padding:12px 16px; border:1px solid #999; border-radius:0; box-shadow:inset 0 -1px 5px #0003; font-size:24px; }
.todo-item.editing>*:not(.edit) { display:none; }
.todo-footer { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; padding:10px 15px; font-size:14px; }
.todo-footer::before { content:''; position:absolute; z-index:-1; left:0; right:0; bottom:0; height:50px; box-shadow:0 1px 1px #0003,0 8px 0 -3px #f6f6f6,0 9px 1px -3px #0003,0 16px 0 -6px #f6f6f6,0 17px 2px -6px #0003; }
.todo-footer nav { display:flex; gap:4px; }
.todo-footer a { text-decoration:none; color:inherit; padding:3px 7px; border:1px solid transparent; border-radius:3px; }
.todo-footer a[aria-current=page] { border-color:#ce4646; }
.todo-footer a:hover { border-color:#e7b4b4; }
#todo-count { margin-right:auto; }
#todo-count strong { font-weight:300; }
.todo-footer button { margin:0; padding:0; border:0; background:none; color:inherit; font:inherit; }
.todo-footer button:hover { text-decoration:underline; }
.todo-instructions { text-align:center; font-size:11px; color:#777; margin:6px 0; }
.lesson-title { margin:30px 0 10px; font:italic 22px Georgia,serif; }
.detail { padding:16px; border:1px dashed #bbb; background:#fff; }
.detail input { font-size:14px; }
#change-list { padding:10px 14px; margin:12px 0; font-size:13px; }
.proof { margin-top:20px; }
@media(max-width:440px) { #app { padding:16px; } .todo-footer { font-size:12px; padding:10px; } .todo-title { font-size:21px; } .todo-item .delete-todo { display:block; } }
`;
