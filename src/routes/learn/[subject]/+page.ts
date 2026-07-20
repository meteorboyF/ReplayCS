import { error } from '@sveltejs/kit';
import { subjects } from '$lib/content/subjects';
export function load({ params }) {
  if (!(params.subject in subjects)) error(404, 'Subject not found');
  return { subject: subjects[params.subject as keyof typeof subjects], id: params.subject };
}
