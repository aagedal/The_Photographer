// One catalog connects scenery, photographic commissions, the map and local histories.
export const regionalLandmarks = [
  { id: 'sea-light', name: 'Bracken Head Light', x: -184, z: 73, height: 32, viewpoint: [-135, 81] as const, entrance: [-177, 78] as const, mission: 'horizon-light', color: '#e9ddbd',
    subtitle: 'The western headland · The light that brought us home',
    memory: '“Your mother counted the flashes from the ferry. Three, then a pause. She said that meant we were nearly home.” Arthur used to bring a flask to the keeper when the winter road was closed. The lamp is automatic now; the worn path to the door is still there.',
    description: 'A tall sea light above the western shore. Arthur remembers your mother counting its flashes from the ferry. Photograph it with the headland around it, as someone arriving home might see it.' },
  { id: 'observatory', name: 'Northstar Observatory', x: -143, z: -183, height: 21, viewpoint: [-111, -146] as const, entrance: [-143, -170] as const, mission: 'horizon-stars', color: '#b7c7c3',
    subtitle: 'The northern heights · A roof open to the sky',
    memory: '“We missed the meteor shower. Cloud all night. Your mother called it a wasted climb until you fell asleep on her coat.” Ida now keeps the old observatory open on clear evenings. Beside the door, a brass plaque lists the volunteers who rebuilt it; Arthur’s name is near the bottom.',
    description: 'Ida is restoring the old observatory on the northern heights. Arthur remembers a cloudy meteor shower and a child asleep on a coat. Make a landscape of its silver dome; an ordinary day can hold a memory, too.' },
  { id: 'viaduct', name: 'Hollowstone Viaduct', x: 160, z: -126, height: 24, viewpoint: [160, -72] as const, entrance: [160, -99] as const, mission: 'horizon-stone', color: '#aa9982',
    subtitle: 'The eastern valley · What the valley kept',
    memory: '“The last train went through before you were born. I kept bringing you here because you liked the echo.” The disused railway once carried clay from the eastern hills. Eli’s grandfather fired his first pots from that clay. Ferns grow between the stones; the arches still carry the line across the valley.',
    description: 'The railway is silent, but its five great arches still cross the eastern valley. Eli’s grandfather sent clay to town on this line. Keep the arches and the valley in the same photograph for Arthur’s album.' },
  { id: 'windmill', name: 'Briar Hill Windmill', x: 181, z: 33, height: 26, viewpoint: [148, 66] as const, entrance: [181, 43] as const, mission: 'horizon-wind', color: '#cfb48c',
    subtitle: 'The eastern uplands · The hill where we waited',
    memory: '“Alma’s father brought bread up here. Your mother brought jam. Nobody remembered a knife.” The mill stopped grinding years ago, but the family still tends its sails. Arthur says the picnic was the first afternoon he stopped worrying whether your mother would like living here.',
    description: 'The windmill watches over the eastern uplands and the sea. Alma’s family still tends its sails. Arthur remembers a picnic here, before Willowbrook felt like home. Bring him a photograph with room for the hill and sky.' },
] as const;
export function nearestLandmark(x: number, z: number) {
  return regionalLandmarks.find(place => Math.hypot(x - place.entrance[0], z - place.entrance[1]) < 5);
}
