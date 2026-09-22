begin;
create table public.collaboration_proposals (
 id uuid primary key default gen_random_uuid(), opportunity_id uuid not null references public.opportunities(id),
 proposer_id uuid not null references public.profiles(id), owner_id uuid not null references public.profiles(id),
 proposer_name text not null, proposer_organization text not null, title text not null, organization text not null,
 objectives text not null check(length(trim(objectives)) between 30 and 4000),
 deliverables text not null check(length(trim(deliverables)) between 20 and 4000),
 timeline text not null check(length(trim(timeline)) between 10 and 2000),
 resources text not null check(length(trim(resources)) between 10 and 3000),
 terms text not null check(length(trim(terms)) between 20 and 4000),
 status text not null default 'Submitted' check(status in ('Submitted','Accepted','Declined','Withdrawn','Completed')),
 completion_requested_at timestamptz, completed_at timestamptz, created_at timestamptz not null default now(),
 unique(opportunity_id,proposer_id), check(owner_id<>proposer_id)
);
create table public.collaboration_milestones (
 id uuid primary key default gen_random_uuid(), proposal_id uuid not null references public.collaboration_proposals(id),
 title text not null check(length(trim(title)) between 4 and 160), criteria text not null check(length(trim(criteria)) between 20 and 3000), due_on date not null,
 status text not null default 'Pending' check(status in ('Pending','Approved')), feedback text not null default '' check(length(feedback)<=3000), reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create table public.collaboration_updates (
 id uuid primary key default gen_random_uuid(), proposal_id uuid not null references public.collaboration_proposals(id),
 author_id uuid not null references public.profiles(id), author_name text not null,
 milestone_id uuid references public.collaboration_milestones(id),
 message text not null check(length(trim(message)) between 10 and 4000),
 evidence_url text not null default '' check(length(evidence_url)<=2000 and (evidence_url='' or evidence_url ~ '^https://')),
 created_at timestamptz not null default now()
);
create table public.collaboration_events (
 id uuid primary key default gen_random_uuid(), proposal_id uuid not null references public.collaboration_proposals(id),
 actor_id uuid not null references public.profiles(id), actor_name text not null,
 title text not null, detail text not null, created_at timestamptz not null default now()
);
create index collaboration_owner on public.collaboration_proposals(owner_id,created_at);
create index collaboration_proposer on public.collaboration_proposals(proposer_id,created_at);
create index collaboration_milestones_proposal on public.collaboration_milestones(proposal_id);
create index collaboration_updates_proposal on public.collaboration_updates(proposal_id,created_at);
create index collaboration_events_proposal on public.collaboration_events(proposal_id,created_at);
alter table public.collaboration_proposals enable row level security;
alter table public.collaboration_milestones enable row level security;
alter table public.collaboration_updates enable row level security;
alter table public.collaboration_events enable row level security;
revoke all on public.collaboration_proposals,public.collaboration_milestones,public.collaboration_updates,public.collaboration_events from public,anon,authenticated;
grant select on public.collaboration_proposals,public.collaboration_milestones,public.collaboration_updates,public.collaboration_events to authenticated;
grant all on public.collaboration_proposals,public.collaboration_milestones,public.collaboration_updates,public.collaboration_events to service_role;
create policy collaboration_read on public.collaboration_proposals for select to authenticated using(auth.uid() in (proposer_id,owner_id));
create policy collaboration_milestones_read on public.collaboration_milestones for select to authenticated using(exists(select 1 from public.collaboration_proposals where id=proposal_id));
create policy collaboration_updates_read on public.collaboration_updates for select to authenticated using(exists(select 1 from public.collaboration_proposals where id=proposal_id));
create policy collaboration_events_read on public.collaboration_events for select to authenticated using(exists(select 1 from public.collaboration_proposals where id=proposal_id));
create function private.collaboration_event(proposal uuid,label text,detail text) returns void language plpgsql security definer set search_path='' as $$
declare p public.collaboration_proposals; recipient record; event uuid;
begin
 select * into p from public.collaboration_proposals where id=proposal;
 insert into public.collaboration_events(proposal_id,actor_id,actor_name,title,detail) select proposal,auth.uid(),full_name,label,detail from public.profiles where id=auth.uid() returning id into event;
 for recipient in select id,role from public.profiles where id in (p.owner_id,p.proposer_id) loop
 perform private.send_notification(recipient.id,'Collaboration','A collaboration workspace has an update','/'||recipient.role||'/collaborations?proposal='||proposal::text,'collaboration:'||event::text);
 end loop;
end $$;
revoke all on function private.collaboration_event(uuid,text,text) from public,anon,authenticated;

create function public.submit_collaboration_proposal(opportunity uuid, objectives text, deliverables text, timeline text, resources text, terms text) returns uuid language plpgsql security definer set search_path='' as $$
declare o public.opportunities; person public.profiles; publisher_role text; result uuid;
begin
 select * into o from public.opportunities where id=opportunity for update;
 select * into person from public.profiles where id=auth.uid();
 select role into publisher_role from public.profiles where id=o.owner_id;
 if auth.uid() is null or person.role is null or person.role not in ('industry','academician','institution') or o.id is null or o.owner_id=auth.uid() then raise exception 'Choose an opportunity from a partner account'; end if;
 if not ((person.role='industry' and publisher_role in ('academician','institution')) or (person.role in ('academician','institution') and publisher_role='industry')) then raise exception 'Partnerships require an industry account and an academician or institution account'; end if;
 if o.type not in ('Research','Consultancy','Live Project') or o.audience not in ('academician','all') or o.status<>'Open' or o.deadline<(now() at time zone 'Asia/Kolkata')::date then raise exception 'Choose an open research, consultancy or live-project call for academia'; end if;
 insert into public.collaboration_proposals(opportunity_id,proposer_id,owner_id,proposer_name,proposer_organization,title,organization,objectives,deliverables,timeline,resources,terms)
 values(o.id,auth.uid(),o.owner_id,person.full_name,coalesce(person.organization,''),o.title,o.company,trim(objectives),trim(deliverables),trim(timeline),trim(resources),trim(terms)) returning id into result;
 perform private.collaboration_event(result,'Proposal submitted','A partnership proposal was submitted for review');
 return result;
end $$;
create function public.decide_collaboration_proposal(proposal uuid, decision text, feedback text) returns void language plpgsql security definer set search_path='' as $$
declare p public.collaboration_proposals;
begin
 select * into p from public.collaboration_proposals where id=proposal for update;
 if auth.uid() is null or p.id is null or p.status<>'Submitted' then raise exception 'Choose a submitted proposal'; end if;
 if decision='Withdrawn' then
  if p.proposer_id<>auth.uid() then raise exception 'Only the proposer can withdraw'; end if;
 elsif decision in ('Accepted','Declined') then
  if p.owner_id<>auth.uid() then raise exception 'Only the opportunity owner can accept or decline'; end if;
 else raise exception 'Choose a valid proposal decision'; end if;
 if feedback is null or length(trim(feedback)) not between 10 and 3000 then raise exception 'Provide a decision explanation of 10–3000 characters'; end if;
 update public.collaboration_proposals set status=decision where id=proposal;
 perform private.collaboration_event(proposal,'Proposal '||lower(decision),trim(feedback));
end $$;
create function public.add_collaboration_milestone(proposal uuid, title text, criteria text, due date) returns void language plpgsql security definer set search_path='' as $$
declare p public.collaboration_proposals;
begin
 select * into p from public.collaboration_proposals where id=proposal for update;
 if auth.uid() is null or p.owner_id is distinct from auth.uid() or p.status<>'Accepted' then raise exception 'Only the opportunity owner can add milestones to an accepted proposal'; end if;
 if p.completion_requested_at is not null then raise exception 'Review the pending completion request before adding scope'; end if;
 insert into public.collaboration_milestones(proposal_id,title,criteria,due_on) values(proposal,trim(title),trim(criteria),due);
 perform private.collaboration_event(proposal,'Milestone added',trim(title));
end $$;
create function public.post_collaboration_update(proposal uuid, message text, milestone uuid default null, evidence text default '') returns void language plpgsql security definer set search_path='' as $$
declare p public.collaboration_proposals;
begin
 select * into p from public.collaboration_proposals where id=proposal for update;
 if auth.uid() is null or p.id is null or auth.uid() not in (p.owner_id,p.proposer_id) or p.status not in ('Submitted','Accepted') then raise exception 'Only participants can update an open collaboration'; end if;
 if milestone is not null and not exists(select 1 from public.collaboration_milestones where id=milestone and proposal_id=proposal) then raise exception 'Choose a milestone from this collaboration'; end if;
 insert into public.collaboration_updates(proposal_id,author_id,author_name,milestone_id,message,evidence_url) select proposal,auth.uid(),full_name,milestone,trim(message),trim(coalesce(evidence,'')) from public.profiles where id=auth.uid();
 if milestone is not null and auth.uid()=p.proposer_id then
  update public.collaboration_milestones set status='Pending',feedback='',reviewed_at=null where id=milestone;
  update public.collaboration_proposals set completion_requested_at=null where id=proposal;
 end if;
 perform private.collaboration_event(proposal,'Partner update posted','A new discussion or delivery update is available');
end $$;
create function public.review_collaboration_milestone(milestone uuid, decision text, feedback text) returns void language plpgsql security definer set search_path='' as $$
declare m public.collaboration_milestones; p public.collaboration_proposals;
begin
 select * into m from public.collaboration_milestones where id=milestone;
 select * into p from public.collaboration_proposals where id=m.proposal_id for update;
 if auth.uid() is null or p.owner_id is distinct from auth.uid() or p.status<>'Accepted' then raise exception 'Only the owner can review an active collaboration'; end if;
 if decision is null or decision not in ('Pending','Approved') or feedback is null or length(trim(feedback)) not between 10 and 3000 then raise exception 'Choose a valid status and provide review feedback'; end if;
 if decision='Approved' and not exists(select 1 from public.collaboration_updates where milestone_id=m.id and author_id=p.proposer_id and evidence_url<>'') then raise exception 'The proposer must submit linked delivery evidence before approval'; end if;
 update public.collaboration_milestones set status=decision,feedback=trim($3),reviewed_at=now() where id=milestone;
 update public.collaboration_proposals set completion_requested_at=null where id=p.id;
 perform private.collaboration_event(p.id,'Milestone review: '||decision||' · '||m.title,trim(feedback));
end $$;
create function public.finish_collaboration(proposal uuid, decision text, feedback text) returns void language plpgsql security definer set search_path='' as $$
declare p public.collaboration_proposals;
begin
 select * into p from public.collaboration_proposals where id=proposal for update;
 if auth.uid() is null or p.id is null or auth.uid() not in (p.proposer_id,p.owner_id) or p.status<>'Accepted' then raise exception 'Choose your accepted collaboration'; end if;
 if feedback is null or length(trim(feedback)) not between 10 and 3000 then raise exception 'Provide a completion explanation'; end if;
 if decision='Request' and p.proposer_id=auth.uid() then
  if p.completion_requested_at is not null then raise exception 'Completion is already awaiting owner review'; end if;
  if not exists(select 1 from public.collaboration_milestones where proposal_id=proposal) or exists(select 1 from public.collaboration_milestones where proposal_id=proposal and status<>'Approved') then raise exception 'At least one milestone and approval of all milestones are required'; end if;
  update public.collaboration_proposals set completion_requested_at=now() where id=proposal;
 elsif decision in ('Confirm','Return') and p.owner_id=auth.uid() then
  if p.completion_requested_at is null then raise exception 'The proposer must request completion first'; end if;
  if decision='Confirm' then
   if exists(select 1 from public.collaboration_milestones where proposal_id=proposal and status<>'Approved') then raise exception 'Approve all milestones before completion'; end if;
   update public.collaboration_proposals set status='Completed',completed_at=now() where id=proposal;
  else update public.collaboration_proposals set completion_requested_at=null where id=proposal; end if;
 else raise exception 'Only the proposer requests completion and only the owner confirms or returns it'; end if;
 perform private.collaboration_event(proposal,'Completion: '||decision,trim(feedback));
end $$;
revoke all on function public.submit_collaboration_proposal(uuid,text,text,text,text,text),public.decide_collaboration_proposal(uuid,text,text),public.add_collaboration_milestone(uuid,text,text,date),public.post_collaboration_update(uuid,text,uuid,text),public.review_collaboration_milestone(uuid,text,text),public.finish_collaboration(uuid,text,text) from public,anon;
grant execute on function public.submit_collaboration_proposal(uuid,text,text,text,text,text),public.decide_collaboration_proposal(uuid,text,text),public.add_collaboration_milestone(uuid,text,text,date),public.post_collaboration_update(uuid,text,uuid,text),public.review_collaboration_milestone(uuid,text,text),public.finish_collaboration(uuid,text,text) to authenticated;
commit;
