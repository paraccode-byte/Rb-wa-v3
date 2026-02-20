const query = `
query ($search: String) {
  Media (search: $search, type: ANIME) {
    id
    title {
      romaji
      english
    }
    status
    episodes
    duration
    genres
    averageScore
    description
    nextAiringEpisode {
      episode
    }
    externalLinks {
      url
      site
      type
    }
    coverImage {
      extraLarge
    }
    characters {
      edges {
        node {
          name {
            full
          }
        }
        role
      }
    } 
    trailer {
      id
      site
      thumbnail
    }
    startDate {
      year
      month
      day
    }
    endDate {
      year
      month
      day
    }
  }
}
`;

const formatDate = (dateObj) => {
  const { year, month, day } = dateObj;
  if (!year || !month || !day) return "Belum diketahui";
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(year, month - 1, day));
};

export default async function search_Anime(teks) {
  const variables = {
    search: teks
  };


  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      query: query,
      variables: variables
    })
  };

  try {
    const response = await fetch('https://graphql.anilist.co', options);
    const result = await response.json();
    const anime = result.data?.Media;
    const rilisAwal = formatDate(anime.startDate);
    const rilisAkhir = formatDate(anime.endDate);
    const link = await (anime.externalLinks || []).filter(l => l.type === 'STREAMING');
    const linkFormat = await link.length > 0
      ? link.map(a => `• ${a.site}: ${a.url}`).join('\n')
      : '• Tidak ada link streaming resmi.';

    if (!anime) return null;
    console.log(anime)
    return {
      title: anime.title.romaji,
      english: anime.title.english || '-',
      status: anime.status,
      genres: anime.genres || [],
      score: anime.averageScore ? `${anime.averageScore}/100` : 'N/A',
      description: anime.description ? anime.description.replace(/<[^>]*>?/gm, '').substring(0, 250) + '...' : 'Tidak ada deskripsi.',
      link: linkFormat,
      poster: anime.coverImage.extraLarge,
      nextepi: anime.nextAiringEpisode?.episode || null,
      total_eps: anime.episodes,
      trailer: anime.trailer && anime.trailer.site === 'youtube'
        ? `https://www.youtube.com/watch?v=${anime.trailer.id}`
        : 'Tidak ada trailer',
      start_eps: `${rilisAwal} sampai ${rilisAkhir}`,
      characters: anime.characters?.edges?.map(e => e.node.name.full) || [],
      duration: anime.duration ? `${anime.duration} Menit` : 'N/A',
    };
  } catch (error) {
    console.error(error);
    return null;
  }
}
