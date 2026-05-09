
-- Likes packages
with cat as (select id from public.categories where name='LIKES PACKAGES' limit 1)
insert into public.packages (category_id,name,description,type,likes_per_day,duration_days,price_bdt,sort_order)
select cat.id, x.name, x.description, 'like'::package_type, x.lpd, x.dur, x.price, x.so
from cat, (values
  ('100 Likes / Day','Daily 100 likes for 7 days',100,7,80,1),
  ('200 Likes / Day','Daily 200 likes for 7 days',200,7,140,2),
  ('500 Likes / Day','Daily 500 likes for 7 days',500,7,300,3)
) as x(name,description,lpd,dur,price,so);

-- Visits packages
with cat as (select id from public.categories where name='VISITS PACKAGES' limit 1)
insert into public.packages (category_id,name,description,type,visits_count,price_bdt,sort_order)
select cat.id, x.name, x.description, 'visit'::package_type, x.v, x.price, x.so
from cat, (values
  ('1K Visits','One time 1,000 profile visits',1000,50,1),
  ('5K Visits','One time 5,000 profile visits',5000,200,2)
) as x(name,description,v,price,so);

-- LEVEL UP BOT packages (delivered as username/password by admin)
with cat as (select id from public.categories where name='LEVEL UP BOT' limit 1)
insert into public.packages (category_id,name,description,type,duration_days,price_bdt,sort_order)
select cat.id, x.name, x.description, 'like'::package_type, x.dur, x.price, x.so
from cat, (values
  ('LEVEL UP BOT — 7 Days','Username & password delivered by admin (7 days access)',7,250,1),
  ('LEVEL UP BOT — 15 Days','Username & password delivered by admin (15 days access)',15,450,2),
  ('LEVEL UP BOT — 30 Days','Username & password delivered by admin (30 days access)',30,800,3)
) as x(name,description,dur,price,so);

-- Panel category + sample panel
insert into public.panel_categories (name, sort_order) values ('VIP PANELS', 1);

with pc as (select id from public.panel_categories where name='VIP PANELS' limit 1)
insert into public.panel_packages (panel_category_id,name,description,price_bdt,duration_label,sort_order)
select pc.id,'VIP Panel — 30 Days','Premium VIP panel access',500,'30 Days',1 from pc;

-- Guild bot package
insert into public.guild_packages (name,description,price_bdt,duration_label,bot_count,sort_order)
values ('Guild Boost — 5 Bots','5 active guild bots for 30 days',600,'30 Days',5,1);
